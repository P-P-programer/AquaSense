<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Datos de red e identificación
            $table->string('ip_address', 45)->nullable();      // IPv4 e IPv6
            $table->string('user_agent')->nullable();
            $table->string('browser', 100)->nullable();
            $table->string('browser_version', 50)->nullable();
            $table->string('os', 100)->nullable();
            $table->string('device_type', 50)->nullable();     // desktop, mobile, tablet

            // Timestamps de sesión
            $table->timestamp('login_at')->useCurrent();
            $table->timestamp('logout_at')->nullable();

            // Geo (reservado para ESP32 / API geolocalización futura)
            $table->json('geolocation_data')->nullable();      // { lat, lng, city, country, source }
            $table->string('geo_source', 50)->nullable();      // 'esp32', 'ip_api', null

            // Estado
            $table->enum('status', ['active', 'logged_out', 'expired', 'forced'])->default('active');
            $table->string('session_id', 100)->nullable()->index();

            $table->timestamps();

            // Índices de consulta frecuente
            $table->index(['user_id', 'login_at']);
            $table->index('ip_address');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_logs');
    }
};
