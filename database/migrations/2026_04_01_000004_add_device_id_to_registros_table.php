<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registros', function (Blueprint $table) {
            $table->foreignId('device_id')
                ->nullable()
                ->after('id')
                ->constrained('devices')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('registros', function (Blueprint $table) {
            $table->dropConstrainedForeignId('device_id');
        });
    }
};
