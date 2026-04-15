<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Note: This table supports organizing devices into geographic zones by city/municipality.
     * Currently seeded with Colombian municipalities (Tolima department).
     * Future: Add other departments by extending the CitySeeder or creating regional seeders.
     */
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index(); // e.g., 'Ibagué'
            $table->string('department')->index(); // e.g., 'Tolima'
            $table->string('country')->default('Colombia')->index();
            $table->integer('dane_code')->unique()->nullable(); // DANE official code
            $table->decimal('latitude', 10, 7); // Centroid latitude
            $table->decimal('longitude', 10, 7); // Centroid longitude
            $table->text('description')->nullable(); // Optional zone description
            $table->timestamps();

            // Composite index for efficient regional queries
            $table->index(['country', 'department']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cities');
    }
};
