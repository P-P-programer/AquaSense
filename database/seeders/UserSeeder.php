<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Usuario administrador
        User::updateOrCreate(
            ['email' => 'admin@aquasene.com'],
            [
                'name'      => 'Administrador Aquasene',
                'password'  => Hash::make('Admin@1234'),
                'role'      => 'admin',
                'is_active' => true,
            ]
        );

        // Usuario estándar de prueba
        User::updateOrCreate(
            ['email' => 'usuario@aquasene.com'],
            [
                'name'      => 'Usuario Prueba',
                'password'  => Hash::make('User@1234'),
                'role'      => 'user',
                'is_active' => true,
            ]
        );

        $this->command->info('✓ Usuarios de prueba creados:');
        $this->command->line('  admin@aquasene.com  →  Admin@1234  (rol: admin)');
        $this->command->line('  usuario@aquasene.com  →  User@1234  (rol: user)');
    }
}
