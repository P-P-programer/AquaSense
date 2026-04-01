<?php

namespace Database\Seeders;

use App\Models\Registro;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class RegistrosSeeder extends Seeder
{
    public function run(): void
    {
        for ($i = 20; $i >= 1; $i--) {
            $ph = round(mt_rand(580, 830) / 100, 2);
            $consumo = round(mt_rand(90, 320) / 10, 2);

            $estado = 'ok';
            if ($ph < 6.5 || $ph > 8.0) {
                $estado = 'warn';
            }
            if ($ph < 6.0 || $ph > 8.5) {
                $estado = 'danger';
            }

            Registro::create([
                'captured_at' => Carbon::now()->subHours($i * 4),
                'ph' => $ph,
                'consumo' => $consumo,
                'turbidez' => null,
                'temperatura' => null,
                'estado' => $estado,
                'source' => 'demo',
            ]);
        }

        $this->command->info('Registros demo creados correctamente.');
    }
}
