<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('report_summaries', function (Blueprint $table) {
            $table->id();
            $table->string('metric')->index();
            $table->string('entity_type')->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->timestamp('period_start')->index();
            $table->enum('period_type', ['day','week','month','year'])->index();
            $table->double('min')->nullable();
            $table->double('max')->nullable();
            $table->double('avg')->nullable();
            $table->double('median')->nullable();
            $table->unsignedBigInteger('count')->nullable();
            $table->unsignedInteger('peak_count')->nullable();
            $table->double('peaks_mean')->nullable();
            $table->json('anomalies')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['metric','period_start','period_type']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('report_summaries');
    }
};
