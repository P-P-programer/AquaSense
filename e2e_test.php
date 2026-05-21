<?php
try {
    // 1) Crear/obtener un admin verificado.
    $admin = \App\Models\User::updateOrCreate(
        ['email' => 'admin_test_e2e@example.com'],
        [
            'name' => 'Admin Test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
            'role' => 'admin',
            'is_active' => true
        ]
    );

    // 2) Crear/obtener una ciudad de prueba.
    $city = \App\Models\City::firstOrCreate(['name' => 'Test City E2E'], ['department' => 'Test Dept', 'country' => 'Test Country']);

    // 3) Crear un dispositivo asociado (si no existe) con identifier único.
    $device = \App\Models\Device::where('identifier', 'TEST-DEV-E2E-001')->first();
    if (!$device) {
        $device = \App\Models\Device::create([
            'identifier' => 'TEST-DEV-E2E-001',
            'city_id' => $city->id,
            'user_id' => $admin->id,
            'name' => 'Test Device E2E',
            'is_active' => true
        ]);
    }

    // 4) Insertar al menos 6 registros en los últimos días para ese device/city con valores ph variados.
    $now = \Carbon\Carbon::now();
    for ($i = 0; $i < 6; $i++) {
        \App\Models\Registro::create([
            'device_id' => $device->id,
            'city_id' => $city->id,
            'captured_at' => (clone $now)->subDays($i)->format('Y-m-d H:i:s'),
            'ph' => 6.5 + ($i * 0.3), // Variados: 6.5, 6.8, 7.1, 7.4, 7.7, 8.0
            'consumo' => 1.0,
            'turbidez' => 0.5,
            'temperatura' => 20.0,
            'estado' => 'activo'
        ]);
    }

    // 5) Invocar el controlador ReportesController@iaResumen con Request POST (metric=ph, granularity=week)
    $request = \Illuminate\Http\Request::create('/api/ia/resumen', 'POST', [
        'metric' => 'ph',
        'granularity' => 'week',
        'device_id' => $device->id,
        'city_id' => $city->id
    ]);

    // Set user for the request
    $request->setUserResolver(fn () => $admin);

    $controller = app(\App\Http\Controllers\Api\ReportesController::class);
    $response = $controller->iaResumen($request);

    // 6) Imprimir status code y JSON response.
    echo "STATUS: " . $response->getStatusCode() . "\n";
    echo "RESPONSE: " . $response->getContent() . "\n";

    // 7) Indicar si el texto parece Gemini o fallback local
    $data = json_decode($response->getContent(), true);
    $resumen = $data['resumen'] ?? '';
    if (str_starts_with($resumen, 'Resumen automático (') || str_contains($resumen, 'No hay suficientes datos')) {
        echo "AI_TYPE: Fallback Local\n";
    } else {
        echo "AI_TYPE: Gemini\n";
    }

} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
