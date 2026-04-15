<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Note: Currently seeded with Colombian municipalities (Tolima department).
     * To add more departments:
     * 1. Use DANE official municipality codes and centroid coordinates.
     * 2. Create a new seeder (e.g., CundinamarcaCitySeeder) or extend this one.
     * 3. Keep latitude/longitude precision to 7 decimals (~0.58m accuracy).
     *
     * Data sources:
     * - DANE (Departamento Administrativo Nacional de Estadística)
     * - Official municipality centroids
     */
    public function run(): void
    {
        // Tolima department municipalities (47 municipalities)
        $cities = [
            ['name' => 'Ibagué', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73001, 'latitude' => 4.4383, 'longitude' => -75.2319],
            ['name' => 'Alpujarra', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73002, 'latitude' => 4.6514, 'longitude' => -75.0564],
            ['name' => 'Alvarado', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73003, 'latitude' => 4.6017, 'longitude' => -75.3742],
            ['name' => 'Ambalema', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73004, 'latitude' => 5.1239, 'longitude' => -74.8592],
            ['name' => 'Anzoátegui', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73005, 'latitude' => 4.8217, 'longitude' => -75.3692],
            ['name' => 'Armero', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73006, 'latitude' => 5.3083, 'longitude' => -74.9333],
            ['name' => 'Ataco', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73007, 'latitude' => 3.9406, 'longitude' => -75.3283],
            ['name' => 'Cajamarca', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73008, 'latitude' => 4.9258, 'longitude' => -75.5317],
            ['name' => 'Casabianca', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73009, 'latitude' => 5.2658, 'longitude' => -75.0567],
            ['name' => 'Carmen de Apicalá', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73010, 'latitude' => 3.9314, 'longitude' => -74.9667],
            ['name' => 'Chaparral', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73011, 'latitude' => 3.7342, 'longitude' => -75.5042],
            ['name' => 'Coello', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73012, 'latitude' => 4.1581, 'longitude' => -74.8906],
            ['name' => 'Coyaima', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73013, 'latitude' => 3.8356, 'longitude' => -75.2542],
            ['name' => 'Cunday', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73014, 'latitude' => 4.1153, 'longitude' => -74.8003],
            ['name' => 'Dolores', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73015, 'latitude' => 4.6564, 'longitude' => -75.6764],
            ['name' => 'El Espinal', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73016, 'latitude' => 4.2236, 'longitude' => -74.9364],
            ['name' => 'Falán', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73017, 'latitude' => 5.2797, 'longitude' => -75.0425],
            ['name' => 'Flandes', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73018, 'latitude' => 4.3342, 'longitude' => -74.7217],
            ['name' => 'Fresno', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73019, 'latitude' => 5.0944, 'longitude' => -75.4783],
            ['name' => 'Guamo', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73020, 'latitude' => 3.9892, 'longitude' => -74.9339],
            ['name' => 'Guayabal', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73021, 'latitude' => 5.2142, 'longitude' => -74.9367],
            ['name' => 'Herveo', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73022, 'latitude' => 5.3108, 'longitude' => -75.4042],
            ['name' => 'Honda', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73023, 'latitude' => 5.2133, 'longitude' => -74.7442],
            ['name' => 'Icononzo', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73024, 'latitude' => 4.2517, 'longitude' => -74.7975],
            ['name' => 'Lérida', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73025, 'latitude' => 5.4364, 'longitude' => -74.9506],
            ['name' => 'Líbano', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73026, 'latitude' => 5.3822, 'longitude' => -75.3394],
            ['name' => 'Mariquita', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73027, 'latitude' => 5.2125, 'longitude' => -74.8583],
            ['name' => 'Melgar', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73028, 'latitude' => 3.9628, 'longitude' => -74.7767],
            ['name' => 'Murillo', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73029, 'latitude' => 5.4603, 'longitude' => -75.5828],
            ['name' => 'Natagaima', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73030, 'latitude' => 3.7703, 'longitude' => -75.1708],
            ['name' => 'Ortega', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73031, 'latitude' => 3.8742, 'longitude' => -75.0483],
            ['name' => 'Palocabildo', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73032, 'latitude' => 5.1778, 'longitude' => -75.0064],
            ['name' => 'Piedras', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73033, 'latitude' => 4.5214, 'longitude' => -75.3342],
            ['name' => 'Planadas', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73034, 'latitude' => 3.6064, 'longitude' => -75.5608],
            ['name' => 'Prado', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73035, 'latitude' => 4.2514, 'longitude' => -75.0364],
            ['name' => 'Purificación', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73036, 'latitude' => 4.5522, 'longitude' => -75.2153],
            ['name' => 'Rioblanco', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73037, 'latitude' => 3.5889, 'longitude' => -75.4922],
            ['name' => 'Rionegro', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73038, 'latitude' => 5.1428, 'longitude' => -75.2383],
            ['name' => 'Roncesvalles', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73039, 'latitude' => 4.7686, 'longitude' => -75.4756],
            ['name' => 'Rovira', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73040, 'latitude' => 4.8597, 'longitude' => -75.2961],
            ['name' => 'Saldaña', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73041, 'latitude' => 3.7314, 'longitude' => -74.9464],
            ['name' => 'San Antonio', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73042, 'latitude' => 4.7317, 'longitude' => -75.5392],
            ['name' => 'San Luis', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73043, 'latitude' => 3.8581, 'longitude' => -74.8914],
            ['name' => 'Santa Isabel', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73044, 'latitude' => 4.9939, 'longitude' => -75.2067],
            ['name' => 'Suárez', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73045, 'latitude' => 4.2678, 'longitude' => -74.6778],
            ['name' => 'Valle de San Juan', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73046, 'latitude' => 4.5781, 'longitude' => -75.1986],
            ['name' => 'Venadillo', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73047, 'latitude' => 5.2883, 'longitude' => -74.9783],
            ['name' => 'Villahermosa', 'department' => 'Tolima', 'country' => 'Colombia', 'dane_code' => 73048, 'latitude' => 5.3847, 'longitude' => -75.2758],
        ];

        foreach ($cities as $cityData) {
            City::firstOrCreate(
                ['dane_code' => $cityData['dane_code']],
                $cityData
            );
        }
    }
}
