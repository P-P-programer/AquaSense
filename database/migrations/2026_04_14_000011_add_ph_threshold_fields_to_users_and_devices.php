<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('ph_safe_min', 4, 2)->nullable()->after('alerts_min_severity');
            $table->decimal('ph_safe_max', 4, 2)->nullable()->after('ph_safe_min');
            $table->decimal('ph_critical_min', 4, 2)->nullable()->after('ph_safe_max');
            $table->decimal('ph_critical_max', 4, 2)->nullable()->after('ph_critical_min');
        });

        Schema::table('devices', function (Blueprint $table) {
            $table->decimal('ph_safe_min', 4, 2)->nullable()->after('connectivity_alerts_enabled');
            $table->decimal('ph_safe_max', 4, 2)->nullable()->after('ph_safe_min');
            $table->decimal('ph_critical_min', 4, 2)->nullable()->after('ph_safe_max');
            $table->decimal('ph_critical_max', 4, 2)->nullable()->after('ph_critical_min');
        });
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropColumn([
                'ph_safe_min',
                'ph_safe_max',
                'ph_critical_min',
                'ph_critical_max',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'ph_safe_min',
                'ph_safe_max',
                'ph_critical_min',
                'ph_critical_max',
            ]);
        });
    }
};
