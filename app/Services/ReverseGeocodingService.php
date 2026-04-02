<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class ReverseGeocodingService
{
    /**
     * @return array{provider: string, city: ?string, country: ?string, address: ?string}|null
     */
    public function reverse(float $lat, float $lng): ?array
    {
        $provider = config('services.geocoding.provider', 'none');

        if ($provider === 'none') {
            return null;
        }

        if ($provider === 'nominatim') {
            return $this->reverseWithNominatim($lat, $lng);
        }

        if ($provider === 'geoapify') {
            return $this->reverseWithGeoapify($lat, $lng);
        }

        return null;
    }

    /**
     * Nominatim es ideal para prototipos chicos; usa User-Agent y rate-limit interno.
     */
    private function reverseWithNominatim(float $lat, float $lng): ?array
    {
        $timeout = (int) config('services.geocoding.timeout_seconds', 2);

        $response = Http::timeout($timeout)
            ->acceptJson()
            ->withHeaders([
                'User-Agent' => config('app.name', 'AquaSense') . '/1.0',
            ])
            ->get('https://nominatim.openstreetmap.org/reverse', [
                'format' => 'jsonv2',
                'lat' => $lat,
                'lon' => $lng,
                'zoom' => 16,
                'addressdetails' => 1,
            ]);

        if (! $response->ok()) {
            return null;
        }

        $data = $response->json();
        $address = $data['address'] ?? [];

        return [
            'provider' => 'nominatim',
            'city' => $address['city'] ?? $address['town'] ?? $address['village'] ?? null,
            'country' => $address['country'] ?? null,
            'address' => $data['display_name'] ?? null,
        ];
    }

    private function reverseWithGeoapify(float $lat, float $lng): ?array
    {
        $apiKey = config('services.geocoding.geoapify_api_key');

        if (! $apiKey) {
            // Geoapify requiere API key. Si no está configurada, falla gracefully.
            // Los datos de latitud/longitud se guardan igual, solo sin enriquecimiento.
            return null;
        }

        $timeout = (int) config('services.geocoding.timeout_seconds', 2);

        $response = Http::timeout($timeout)
            ->acceptJson()
            ->get('https://api.geoapify.com/v1/geocode/reverse', [
                'lat' => $lat,
                'lon' => $lng,
                'format' => 'json',
                'apiKey' => $apiKey,  // Simplemente la API key va como querystring
            ]);

        if (! $response->ok()) {
            return null;
        }

        $data = $response->json();
        $first = $data['results'][0] ?? null;

        if (! $first) {
            return null;
        }

        return [
            'provider' => 'geoapify',
            'city' => $first['city'] ?? $first['town'] ?? $first['village'] ?? null,
            'country' => $first['country'] ?? null,
            'address' => $first['formatted'] ?? null,
        ];
    }
}
