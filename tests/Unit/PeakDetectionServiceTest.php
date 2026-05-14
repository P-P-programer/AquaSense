<?php

namespace Tests\Unit;

use App\Services\PeakDetectionService;
use Tests\TestCase;

class PeakDetectionServiceTest extends TestCase
{
    public function test_detects_spike_in_stable_series_using_absolute_threshold(): void
    {
        $service = new PeakDetectionService();

        $rows = [
            ['label' => 'A', 'avg' => 7.0],
            ['label' => 'B', 'avg' => 7.0],
            ['label' => 'C', 'avg' => 7.0],
            ['label' => 'D', 'avg' => 7.0],
            ['label' => 'E', 'avg' => 7.0],
            ['label' => 'F', 'avg' => 8.0],
        ];

        $result = $service->enrichRows($rows, [
            'window' => 5,
            'min_samples' => 3,
            'absolute_spike_threshold' => 0.5,
        ]);

        $this->assertSame(1, $result['summary']['anomaly_count']);
        $this->assertTrue($result['rows'][5]['is_anomaly']);
        $this->assertSame('up', $result['rows'][5]['trend']);
    }

    public function test_returns_no_anomaly_when_history_is_insufficient(): void
    {
        $service = new PeakDetectionService();

        $rows = [
            ['label' => 'A', 'avg' => 7.0],
            ['label' => 'B', 'avg' => 7.4],
        ];

        $result = $service->enrichRows($rows, [
            'window' => 5,
            'min_samples' => 5,
        ]);

        $this->assertSame(0, $result['summary']['anomaly_count']);
        $this->assertFalse($result['rows'][1]['is_anomaly']);
        $this->assertSame('Muestras históricas insuficientes para evaluar anomalías.', $result['rows'][1]['anomaly_reason']);
    }

    public function test_computes_overall_trend_for_increasing_series(): void
    {
        $service = new PeakDetectionService();

        $rows = [
            ['label' => 'A', 'avg' => 6.8],
            ['label' => 'B', 'avg' => 6.9],
            ['label' => 'C', 'avg' => 7.0],
            ['label' => 'D', 'avg' => 7.1],
            ['label' => 'E', 'avg' => 7.2],
            ['label' => 'F', 'avg' => 7.3],
        ];

        $result = $service->enrichRows($rows, [
            'window' => 5,
            'min_samples' => 3,
        ]);

        $this->assertSame('up', $result['summary']['trend']);
    }
}
