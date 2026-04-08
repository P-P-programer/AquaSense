<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('registros', function (Blueprint $table) {
            $table->string('power_source', 20)->nullable()->after('source')->index();
            $table->decimal('backup_level', 5, 2)->nullable()->after('power_source');
            $table->timestamp('power_event_at')->nullable()->after('backup_level');
        });
    }

    public function down(): void
    {
        Schema::table('registros', function (Blueprint $table) {
            $table->dropColumn(['power_source', 'backup_level', 'power_event_at']);
        });
    }
};
