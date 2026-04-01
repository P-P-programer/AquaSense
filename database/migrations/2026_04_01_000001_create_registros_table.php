<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros', function (Blueprint $table) {
            $table->id();
            $table->timestamp('captured_at')->index();
            $table->decimal('ph', 4, 2)->nullable();
            $table->decimal('consumo', 10, 2)->nullable()->default(0);
            $table->decimal('turbidez', 8, 2)->nullable();
            $table->decimal('temperatura', 5, 2)->nullable();
            $table->string('estado', 20)->default('ok')->index();
            $table->string('source', 30)->default('demo');
            $table->timestamps();

            $table->index(['captured_at', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros');
    }
};
