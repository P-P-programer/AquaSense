<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->decimal('expected_latitude', 10, 7)->nullable()->after('last_seen_at');
            $table->decimal('expected_longitude', 10, 7)->nullable()->after('expected_latitude');
            $table->unsignedInteger('expected_radius_m')->default(100)->after('expected_longitude');

            $table->decimal('last_latitude', 10, 7)->nullable()->after('expected_radius_m');
            $table->decimal('last_longitude', 10, 7)->nullable()->after('last_latitude');
            $table->unsignedInteger('last_accuracy_m')->nullable()->after('last_longitude');
            $table->timestamp('last_location_at')->nullable()->after('last_accuracy_m')->index();
            $table->json('last_location_meta')->nullable()->after('last_location_at');
        });

        Schema::create('device_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->timestamp('captured_at')->index();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->unsignedInteger('accuracy_m')->nullable();
            $table->boolean('inside_expected_zone')->nullable()->index();
            $table->unsignedInteger('distance_to_expected_m')->nullable();
            $table->string('source', 40)->default('esp32');
            $table->string('geo_provider', 40)->nullable();
            $table->string('city', 120)->nullable();
            $table->string('country', 120)->nullable();
            $table->string('address')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['device_id', 'captured_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_locations');

        Schema::table('devices', function (Blueprint $table) {
            $table->dropColumn([
                'expected_latitude',
                'expected_longitude',
                'expected_radius_m',
                'last_latitude',
                'last_longitude',
                'last_accuracy_m',
                'last_location_at',
                'last_location_meta',
            ]);
        });
    }
};
