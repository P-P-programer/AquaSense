import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import MapComponent from "./MapComponent";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  return diffMs <= 60000;
}

function formatCoords(lat, lng) {
  if (lat == null || lng == null) return "—";
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
}

function StatusChip({ online, labelOnline = "online", labelOffline = "offline" }) {
  return <span className={`aq-state-chip ${online ? "online" : "offline"}`}>{online ? labelOnline : labelOffline}</span>;
}

function StatusChipNeutral({ active }) {
  return <span className={`aq-state-chip ${active ? "neutral-on" : "neutral-off"}`}>{active ? "activo" : "inactivo"}</span>;
}

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [deviceLocations, setDeviceLocations] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [zonePickerEnabled, setZonePickerEnabled] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [mapFocusTarget, setMapFocusTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const [userForm, setUserForm] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    role: "user",
    is_active: true,
  });

  const [deviceForm, setDeviceForm] = useState({
    id: null,
    user_id: "",
    name: "",
    identifier: "",
    is_active: true,
    expected_latitude: "",
    expected_longitude: "",
    expected_radius_m: 100,
  });

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId],
  );

  async function loadAll() {
    setLoading(true);
    setError(null);
    setSuccess("");

    try {
      const [usersData, devicesData] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminDevices(),
      ]);

      setUsers(usersData);
      setDevices(devicesData);

      if (selectedDeviceId) {
        const [tokensData, locationsData] = await Promise.all([
          api.getAdminDeviceTokens(selectedDeviceId),
          api.getAdminDeviceLocations(selectedDeviceId, 50),
        ]);
        setTokens(tokensData);
        setDeviceLocations(locationsData);
      }
    } catch (err) {
      setError(err.message ?? "No se pudieron cargar los datos del admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) {
      setTokens([]);
      setDeviceLocations([]);
      return;
    }

    Promise.all([
      api.getAdminDeviceTokens(selectedDeviceId),
      api.getAdminDeviceLocations(selectedDeviceId, 50),
    ])
      .then(([tokensData, locationsData]) => {
        setTokens(tokensData);
        setDeviceLocations(locationsData);
      })
      .catch((err) => setError(err.message ?? "No se pudieron cargar los tokens."));
  }, [selectedDeviceId]);

  function resetUserForm() {
    setUserForm({
      id: null,
      name: "",
      email: "",
      password: "",
      role: "user",
      is_active: true,
    });
  }

  function resetDeviceForm() {
    setDeviceForm({
      id: null,
      user_id: "",
      name: "",
      identifier: "",
      is_active: true,
      expected_latitude: "",
      expected_longitude: "",
      expected_radius_m: 100,
    });
    setZonePickerEnabled(false);
    setPlaceQuery("");
    setPlaceResults([]);
  }

  function editUser(user) {
    setUserForm({
      id: user.id,
      name: user.name ?? "",
      email: user.email ?? "",
      password: "",
      role: user.role ?? "user",
      is_active: Boolean(user.is_active),
    });
  }

  function editDevice(device) {
    setDeviceForm({
      id: device.id,
      user_id: device.user_id ?? "",
      name: device.name ?? "",
      identifier: device.identifier ?? "",
      is_active: Boolean(device.is_active),
      expected_latitude: device.expected_latitude ?? "",
      expected_longitude: device.expected_longitude ?? "",
      expected_radius_m: device.expected_radius_m ?? 100,
    });
    setSelectedDeviceId(device.id);
    setMapFocusTarget(
      device.last_latitude != null && device.last_longitude != null
        ? { latitude: Number(device.last_latitude), longitude: Number(device.last_longitude), zoom: 16, tick: Date.now() }
        : null,
    );
  }

  function pickZoneCenter({ latitude, longitude }) {
    setDeviceForm((cur) => ({
      ...cur,
      expected_latitude: Number(latitude).toFixed(7),
      expected_longitude: Number(longitude).toFixed(7),
    }));
  }

  async function searchPlaces(e) {
    e.preventDefault();
    const query = placeQuery.trim();
    if (!query) return;

    setSearchingPlace(true);
    setError(null);
    setSuccess("");

    try {
      const results = await api.geocodeSearch(query);
      setPlaceResults(results);
    } catch (err) {
      setError(err.message ?? "No se pudo buscar la ubicación.");
    } finally {
      setSearchingPlace(false);
    }
  }

  function selectPlace(place) {
    pickZoneCenter({ latitude: place.latitude, longitude: place.longitude });
    setMapFocusTarget({
      latitude: place.latitude,
      longitude: place.longitude,
      zoom: 16,
      tick: Date.now(),
    });
  }

  async function submitUser(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess("");

    try {
      const payload = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        is_active: userForm.is_active,
      };

      if (userForm.password.trim()) {
        payload.password = userForm.password;
      }

      if (userForm.id) {
        await api.updateAdminUser(userForm.id, payload);
        setSuccess("Usuario actualizado correctamente.");
      } else {
        await api.createAdminUser({ ...payload, password: userForm.password });
        setSuccess("Usuario creado correctamente.");
      }

      await loadAll();
      resetUserForm();
    } catch (err) {
      setError(err.message ?? "No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function submitDevice(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess("");

    try {
      const payload = {
        user_id: deviceForm.user_id ? Number(deviceForm.user_id) : null,
        name: deviceForm.name,
        identifier: deviceForm.identifier || undefined,
        is_active: deviceForm.is_active,
        expected_latitude: deviceForm.expected_latitude === "" ? null : Number(deviceForm.expected_latitude),
        expected_longitude: deviceForm.expected_longitude === "" ? null : Number(deviceForm.expected_longitude),
        expected_radius_m: deviceForm.expected_radius_m ? Number(deviceForm.expected_radius_m) : 100,
      };

      if (deviceForm.id) {
        await api.updateAdminDevice(deviceForm.id, payload);
        setSuccess("Dispositivo actualizado correctamente.");
      } else {
        await api.createAdminDevice(payload);
        setSuccess("Dispositivo creado correctamente.");
      }

      await loadAll();
      resetDeviceForm();
    } catch (err) {
      setError(err.message ?? "No se pudo guardar el dispositivo.");
    } finally {
      setSaving(false);
    }
  }

  async function generateToken(e) {
    e.preventDefault();
    if (!selectedDeviceId) return;

    setSaving(true);
    setError(null);
    setGeneratedToken(null);
    setSuccess("");

    try {
      const response = await api.createAdminDeviceToken(selectedDeviceId, {
        label: e.target.label.value,
      });

      setGeneratedToken(response);
      setTokens((current) => [response.device_token, ...current]);
      setSuccess("Token generado correctamente.");
      e.target.reset();
    } catch (err) {
      setError(err.message ?? "No se pudo generar el token.");
    } finally {
      setSaving(false);
    }
  }

  async function revokeToken(tokenId) {
    setSaving(true);
    setError(null);
    setSuccess("");

    try {
      await api.revokeAdminDeviceToken(tokenId);
      const freshTokens = await api.getAdminDeviceTokens(selectedDeviceId);
      setTokens(freshTokens);
      setSuccess("Token revocado correctamente.");
    } catch (err) {
      setError(err.message ?? "No se pudo revocar el token.");
    } finally {
      setSaving(false);
    }
  }

  const onlineCount = devices.filter((device) => isOnline(device.last_seen_at)).length;
  const activeDevicesCount = devices.filter((device) => Boolean(device.is_active)).length;
  const inactiveDevicesCount = devices.length - activeDevicesCount;

  return (
    <section className="aq-admin-shell">
      <div className="aq-admin-header">
        <div>
          <div className="aq-section-kicker">Panel admin</div>
          <h2 className="aq-section-title">Usuarios, dispositivos y tokens</h2>
          <p className="aq-section-sub">Administra accesos y valida el estado del ESP32 desde un solo lugar.</p>
        </div>

        <div className="aq-admin-summary">
          <div className="aq-admin-summary-card">
            <span>Usuarios</span>
            <strong>{users.length}</strong>
          </div>
          <div className="aq-admin-summary-card">
            <span>Dispositivos</span>
            <strong>{devices.length}</strong>
          </div>
          <div className="aq-admin-summary-card">
            <span>Online</span>
            <strong>{onlineCount}</strong>
          </div>
        </div>
      </div>

      {error && <div className="aq-alert-error"><i className="bi bi-exclamation-triangle"></i> {error}</div>}
      {success && <div className="aq-alert-success"><i className="bi bi-check-circle"></i> {success}</div>}
      {loading && <div className="aq-loading"><div className="aq-spinner"></div> Cargando panel admin...</div>}

      {devices.length > 0 && (
        <div className="aq-admin-card aq-admin-card-wide">
          <div className="aq-panel-title"><i className="bi bi-geo-alt-fill"></i> Mapa de dispositivos en tiempo real</div>
          <p className="aq-section-sub" style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
            Ubicación actual de todos los ESP32 · Actualiza automáticamente cada 15 segundos
          </p>
          <MapComponent
            devices={devices}
            onDeviceSelect={setSelectedDeviceId}
            selectedDeviceId={selectedDeviceId}
            zoneDraft={{
              latitude: deviceForm.expected_latitude === "" ? null : Number(deviceForm.expected_latitude),
              longitude: deviceForm.expected_longitude === "" ? null : Number(deviceForm.expected_longitude),
              radius: Number(deviceForm.expected_radius_m || 100),
            }}
            onPickZoneCenter={pickZoneCenter}
            mapFocusTarget={mapFocusTarget}
            zonePickerEnabled={zonePickerEnabled}
          />
        </div>
      )}

      <div className="aq-admin-grid">
        <div className="aq-admin-card">
          <div className="aq-panel-title"><i className="bi bi-person-plus"></i> Usuarios</div>
          <form onSubmit={submitUser} className="aq-admin-form">
            <div className="aq-admin-form-grid">
              <div>
                <label className="aq-input-label">Nombre</label>
                <input className="aq-input" value={userForm.name} onChange={(e) => setUserForm((cur) => ({ ...cur, name: e.target.value }))} required />
              </div>
              <div>
                <label className="aq-input-label">Correo</label>
                <input className="aq-input" type="email" value={userForm.email} onChange={(e) => setUserForm((cur) => ({ ...cur, email: e.target.value }))} required />
              </div>
              <div>
                <label className="aq-input-label">Contraseña {userForm.id ? "(opcional)" : ""}</label>
                <input className="aq-input" type="password" minLength={userForm.id ? 0 : 8} value={userForm.password} onChange={(e) => setUserForm((cur) => ({ ...cur, password: e.target.value }))} placeholder={userForm.id ? "Dejar vacío para no cambiar" : "Mínimo 8 caracteres"} required={!userForm.id} />
              </div>
              <div>
                <label className="aq-input-label">Rol</label>
                <select className="aq-input" value={userForm.role} onChange={(e) => setUserForm((cur) => ({ ...cur, role: e.target.value }))}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            <label className="aq-switch-row">
              <input type="checkbox" checked={userForm.is_active} onChange={(e) => setUserForm((cur) => ({ ...cur, is_active: e.target.checked }))} />
              <span>Usuario activo</span>
            </label>

            <div className="aq-admin-actions">
              <button type="submit" className="aq-btn-primary" disabled={saving}>{userForm.id ? "Actualizar usuario" : "Crear usuario"}</button>
              <button type="button" className="aq-btn-secondary" onClick={resetUserForm}>Limpiar</button>
            </div>
          </form>

          <div className="aq-admin-table-wrap">
            <table className="aq-table aq-admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Dispositivos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <div className="aq-table-meta">{user.email}</div>
                    </td>
                    <td>{user.role}</td>
                    <td><StatusChip online={user.is_active} labelOnline="activo" labelOffline="inactivo" /></td>
                    <td>
                      <strong>{user.devices_count ?? 0}</strong>
                      <div className="aq-table-meta">activos: {user.devices_active_count ?? 0} · inactivos: {user.devices_inactive_count ?? 0}</div>
                    </td>
                    <td>
                      <button type="button" className="aq-link-button" onClick={() => editUser(user)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="aq-admin-card">
          <div className="aq-panel-title"><i className="bi bi-cpu"></i> Dispositivos</div>
          <div className="aq-table-meta" style={{ marginBottom: "0.7rem" }}>
            Total: {devices.length} · Activos: {activeDevicesCount} · Inactivos: {inactiveDevicesCount}
          </div>
          <form onSubmit={submitDevice} className="aq-admin-form">
            <div className="aq-admin-form-grid">
              <div>
                <label className="aq-input-label">Propietario</label>
                <select className="aq-input" value={deviceForm.user_id} onChange={(e) => setDeviceForm((cur) => ({ ...cur, user_id: e.target.value }))}>
                  <option value="">Sin asignar</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="aq-input-label">Nombre</label>
                <input className="aq-input" value={deviceForm.name} onChange={(e) => setDeviceForm((cur) => ({ ...cur, name: e.target.value }))} required />
              </div>
              <div>
                <label className="aq-input-label">Identificador</label>
                <input className="aq-input" value={deviceForm.identifier} onChange={(e) => setDeviceForm((cur) => ({ ...cur, identifier: e.target.value }))} placeholder="Se genera solo si lo dejas vacío" />
              </div>
              <div>
                <label className="aq-input-label">Estado</label>
                <div className="aq-switch-row">
                  <input type="checkbox" checked={deviceForm.is_active} onChange={(e) => setDeviceForm((cur) => ({ ...cur, is_active: e.target.checked }))} />
                  <span>Dispositivo activo</span>
                </div>
              </div>
              <div>
                <label className="aq-input-label">Latitud esperada</label>
                <input className="aq-input" type="number" step="0.0000001" value={deviceForm.expected_latitude} onChange={(e) => setDeviceForm((cur) => ({ ...cur, expected_latitude: e.target.value }))} placeholder="Ej. 4.7110000" />
              </div>
              <div>
                <label className="aq-input-label">Longitud esperada</label>
                <input className="aq-input" type="number" step="0.0000001" value={deviceForm.expected_longitude} onChange={(e) => setDeviceForm((cur) => ({ ...cur, expected_longitude: e.target.value }))} placeholder="Ej. -74.0721000" />
              </div>
              <div>
                <label className="aq-input-label">Radio permitido (m)</label>
                <input className="aq-input" type="number" min="10" max="100000" value={deviceForm.expected_radius_m} onChange={(e) => setDeviceForm((cur) => ({ ...cur, expected_radius_m: e.target.value }))} />
              </div>
            </div>

            <div className="aq-zone-tools">
              <div className="aq-input-label" style={{ marginBottom: 6 }}>Zona esperada interactiva</div>
              <div className="aq-zone-inline">
                <button
                  type="button"
                  className="aq-btn-secondary"
                  onClick={() => setZonePickerEnabled((cur) => !cur)}
                >
                  {zonePickerEnabled ? "Desactivar selección en mapa" : "Activar selección en mapa"}
                </button>
                <span className="aq-table-meta">
                  {zonePickerEnabled
                    ? "Haz click en el mapa para fijar latitud y longitud."
                    : "Activa para seleccionar ubicación con click en el mapa."}
                </span>
              </div>

              <form className="aq-zone-search" onSubmit={searchPlaces}>
                <input
                  className="aq-input"
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  placeholder="Buscar ciudad o dirección (ej. Bogotá, Calle 100...)"
                />
                <button type="submit" className="aq-btn-secondary" disabled={searchingPlace}>
                  {searchingPlace ? "Buscando..." : "Buscar"}
                </button>
              </form>

              {placeResults.length > 0 && (
                <div className="aq-zone-results">
                  {placeResults.map((place, index) => (
                    <button
                      key={`${place.latitude}-${place.longitude}-${index}`}
                      type="button"
                      className="aq-link-button"
                      onClick={() => selectPlace(place)}
                    >
                      {place.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="aq-admin-actions">
              <button type="submit" className="aq-btn-primary" disabled={saving}>{deviceForm.id ? "Actualizar dispositivo" : "Crear dispositivo"}</button>
              <button type="button" className="aq-btn-secondary" onClick={resetDeviceForm}>Limpiar</button>
            </div>
          </form>

          <div className="aq-admin-table-wrap">
            <table className="aq-table aq-admin-table">
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Propietario</th>
                  <th>Última señal</th>
                  <th>Última posición</th>
                  <th>Conectividad</th>
                  <th>Asignación</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => {
                  const online = isOnline(device.last_seen_at);

                  return (
                    <tr key={device.id} className={selectedDeviceId === device.id ? "is-selected" : ""}>
                      <td>
                        <strong>{device.name}</strong>
                        <div className="aq-table-meta">{device.identifier}</div>
                      </td>
                      <td>{device.user?.name ?? "Sin asignar"}</td>
                      <td>{formatDate(device.last_seen_at)}</td>
                      <td>{formatCoords(device.last_latitude, device.last_longitude)}</td>
                      <td><StatusChip online={online} labelOnline="online" labelOffline="sin señal" /></td>
                      <td><StatusChipNeutral active={Boolean(device.is_active)} /></td>
                      <td>
                        <button type="button" className="aq-link-button" onClick={() => editDevice(device)}>Editar</button>
                        <button type="button" className="aq-link-button" onClick={() => setSelectedDeviceId(device.id)}>
                          Tokens
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="aq-admin-card aq-admin-card-wide">
        <div className="aq-admin-token-head">
          <div>
            <div className="aq-panel-title"><i className="bi bi-key"></i> Tokens del dispositivo</div>
            <div className="aq-table-meta">
              {selectedDevice ? `${selectedDevice.name} · ${selectedDevice.identifier}` : "Selecciona un dispositivo para ver o generar tokens."}
            </div>
            {selectedDevice && (
              <div className="aq-table-meta">
                Última ubicación: {formatCoords(selectedDevice.last_latitude, selectedDevice.last_longitude)} ·
                Distancia objetivo: {selectedDevice.latest_location?.distance_to_expected_m ?? "—"} m ·
                Estado: {selectedDevice.is_active ? "dispositivo activo" : "dispositivo inactivo"}
              </div>
            )}
          </div>
          <StatusChip online={Boolean(selectedDevice && isOnline(selectedDevice.last_seen_at))} labelOnline="activo" labelOffline="sin señal" />
        </div>

        {selectedDevice && (
          <form onSubmit={generateToken} className="aq-admin-token-form">
            <input className="aq-input" name="label" placeholder="Etiqueta del token (ej. ESP32 principal)" />
            <button type="submit" className="aq-btn-primary" disabled={saving}>Generar token</button>
          </form>
        )}

        {generatedToken?.token && (
          <div className="aq-token-box">
            <span className="aq-token-label">Token generado una sola vez</span>
            <code>{generatedToken.token}</code>
          </div>
        )}

        <div className="aq-admin-token-list">
          {tokens.map((token) => (
            <div className="aq-token-item" key={token.id}>
              <div>
                <strong>{token.label || `Token ${token.id}`}</strong>
                <div className="aq-table-meta">Prefijo: {token.token_prefix || "—"} · Último uso: {formatDate(token.last_used_at)}</div>
                <div className="aq-table-meta">Revocado: {token.revoked_at ? formatDate(token.revoked_at) : "No"}</div>
              </div>
              <button
                type="button"
                className="aq-btn-secondary"
                onClick={() => revokeToken(token.id)}
                disabled={saving || Boolean(token.revoked_at)}
              >
                {token.revoked_at ? "Revocado" : "Revocar"}
              </button>
            </div>
          ))}
        </div>

        {selectedDevice && (
          <div className="aq-admin-token-list">
            <div className="aq-panel-title"><i className="bi bi-geo-alt"></i> Historial reciente de ubicación</div>
            {deviceLocations.slice(0, 6).map((loc) => (
              <div className="aq-token-item" key={loc.id}>
                <div>
                  <strong>{formatCoords(loc.latitude, loc.longitude)}</strong>
                  <div className="aq-table-meta">Captura: {formatDate(loc.captured_at)} · Precisión: {loc.accuracy_m ?? "—"} m</div>
                  <div className="aq-table-meta">Ciudad: {loc.city ?? "—"} · País: {loc.country ?? "—"}</div>
                </div>
                <StatusChip
                  online={loc.inside_expected_zone !== false}
                  labelOnline={loc.inside_expected_zone == null ? "sin zona" : "en zona"}
                  labelOffline="fuera de zona"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
