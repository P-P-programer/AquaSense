<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('action_type', ['export', 'ia_summary'])->index();
            $table->enum('format', ['xlsx', 'docx'])->nullable()->index();
            $table->string('metric')->index();
            $table->string('granularity')->nullable()->index();
            $table->json('filters')->nullable();
            $table->unsignedInteger('rows_count')->nullable();
            $table->string('file_name')->nullable();
            $table->string('file_path')->nullable();
            $table->string('download_url')->nullable();
            $table->text('summary_text')->nullable();
            $table->string('status')->default('completed')->index();
            $table->timestamps();

            $table->index(['user_id', 'action_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_activities');
    }
};
