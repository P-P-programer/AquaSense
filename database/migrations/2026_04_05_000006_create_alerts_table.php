<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('type', 80);
            $table->string('severity', 20);
            $table->string('status', 20)->default('active');
            $table->string('title', 160);
            $table->text('message');
            $table->json('data')->nullable();
            $table->timestamp('first_triggered_at');
            $table->timestamp('last_triggered_at');
            $table->unsignedInteger('triggered_count')->default(1);
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('notified_email_at')->nullable();
            $table->timestamp('notified_push_at')->nullable();
            $table->timestamps();

            $table->index(['device_id', 'status']);
            $table->index(['status', 'severity']);
            $table->index(['type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
