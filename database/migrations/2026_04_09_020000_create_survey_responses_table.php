<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('survey_responses', function (Blueprint $table) {
            $table->id();
            $table->string('full_name', 150);
            $table->string('document_id', 40)->index();
            $table->string('selected_city', 100)->index();
            $table->string('education_level', 30)->index();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->boolean('notifications_enabled')->default(false);
            $table->string('geocoded_city', 120)->nullable();
            $table->string('country', 120)->nullable();
            $table->text('address')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_responses');
    }
};
