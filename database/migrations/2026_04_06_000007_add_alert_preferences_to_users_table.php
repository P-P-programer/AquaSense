<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('alerts_notify_email')->default(true)->after('is_active');
            $table->boolean('alerts_notify_push')->default(true)->after('alerts_notify_email');
            $table->string('alerts_min_severity', 20)->default('media')->after('alerts_notify_push');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'alerts_notify_email',
                'alerts_notify_push',
                'alerts_min_severity',
            ]);
        });
    }
};
