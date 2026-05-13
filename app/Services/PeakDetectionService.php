<?php

namespace App\Services;

class PeakDetectionService
{
    private const DEFAULT_WINDOW = 5;
    private const DEFAULT_ZSCORE_THRESHOLD = 2.5;
    private const DEFAULT_MIN_SAMPLES = 5;
    private const DEFAULT_ABSOLUTE_SPIKE_THRESHOLD = 0.5;

    /**
     * Enrich aggregated rows with anomaly and trend metadata.
     *
     * Expected row shape: ['label' => string, 'avg' => float|null, ...]
     */
    public function enrichRows(array $rows, array $options = []): array
    {
        $window = max(2, (int) ($options['window'] ?? self::DEFAULT_WINDOW));
        $zscoreThreshold = (float) ($options['zscore_threshold'] ?? self::DEFAULT_ZSCORE_THRESHOLD);
        $minSamples = max(2, (int) ($options['min_samples'] ?? self::DEFAULT_MIN_SAMPLES));
        $absoluteSpikeThreshold = (float) ($options['absolute_spike_threshold'] ?? self::DEFAULT_ABSOLUTE_SPIKE_THRESHOLD);

        $values = array_map(
            static fn (array $row): ?float => isset($row['avg']) && is_numeric($row['avg']) ? (float) $row['avg'] : null,
            $rows
        );

        $overallTrend = $this->computeOverallTrend($values);
        $enrichedRows = [];
        $anomalyCount = 0;

        foreach ($rows as $index => $row) {
            $value = $values[$index] ?? null;

            $history = $this->previousValues($values, $index, $window);
            $localTrend = $this->computeLocalTrend($values, $index);

            $isAnomaly = false;
            $anomalyScore = null;
            $reason = null;

            if ($value === null) {
                $reason = 'Sin promedio disponible para evaluar anomalías.';
            } elseif (count($history) < $minSamples) {
                $reason = 'Muestras históricas insuficientes para evaluar anomalías.';
            } else {
                $mean = $this->mean($history);
                $stdDev = $this->standardDeviation($history, $mean);
                $delta = abs($value - $mean);

                if ($stdDev === 0.0) {
                    if ($delta >= $absoluteSpikeThreshold) {
                        $isAnomaly = true;
                        $reason = 'Pico detectado por salto absoluto en serie estable.';
                    } else {
                        $reason = 'Serie estable sin variación abrupta.';
                    }
                } else {
                    $zscore = $delta / $stdDev;
                    $anomalyScore = round($zscore, 2);

                    if ($zscore >= $zscoreThreshold) {
                        $isAnomaly = true;
                        $reason = 'Pico detectado por desviación z-score.';
                    } else {
                        $reason = 'Variación dentro del rango esperado.';
                    }
                }
            }

            if ($isAnomaly) {
                $anomalyCount++;
            }

            $enrichedRows[] = array_merge($row, [
                'is_anomaly' => $isAnomaly,
                'trend' => $localTrend,
                'anomaly_score' => $anomalyScore,
                'anomaly_reason' => $reason,
            ]);
        }

        return [
            'rows' => $enrichedRows,
            'summary' => [
                'trend' => $overallTrend,
                'anomaly_count' => $anomalyCount,
                'window' => $window,
                'zscore_threshold' => $zscoreThreshold,
                'min_samples' => $minSamples,
                'absolute_spike_threshold' => $absoluteSpikeThreshold,
            ],
        ];
    }

    private function previousValues(array $values, int $index, int $window): array
    {
        $start = max(0, $index - $window);
        $history = array_slice($values, $start, $index - $start);

        return array_values(array_filter($history, static fn (?float $value): bool => $value !== null));
    }

    private function computeLocalTrend(array $values, int $index): string
    {
        $current = $values[$index] ?? null;
        $previous = $this->lastNumericValue($values, $index - 1);

        if ($current === null || $previous === null) {
            return 'flat';
        }

        $delta = $current - $previous;
        if ($delta > 0.03) {
            return 'up';
        }

        if ($delta < -0.03) {
            return 'down';
        }

        return 'flat';
    }

    private function computeOverallTrend(array $values): string
    {
        $first = $this->firstNumericValue($values);
        $last = $this->lastNumericValue($values, count($values) - 1);

        if ($first === null || $last === null || count($values) < 2) {
            return 'flat';
        }

        $slope = ($last - $first) / max(1, count($values) - 1);

        if ($slope > 0.03) {
            return 'up';
        }

        if ($slope < -0.03) {
            return 'down';
        }

        return 'flat';
    }

    private function firstNumericValue(array $values): ?float
    {
        foreach ($values as $value) {
            if ($value !== null) {
                return (float) $value;
            }
        }

        return null;
    }

    private function lastNumericValue(array $values, int $fromIndex): ?float
    {
        for ($i = $fromIndex; $i >= 0; $i--) {
            if (array_key_exists($i, $values) && $values[$i] !== null) {
                return (float) $values[$i];
            }
        }

        return null;
    }

    private function mean(array $values): float
    {
        return array_sum($values) / count($values);
    }

    private function standardDeviation(array $values, float $mean): float
    {
        if (count($values) < 2) {
            return 0.0;
        }

        $variance = array_reduce(
            $values,
            static fn (float $carry, float $value): float => $carry + (($value - $mean) ** 2),
            0.0
        ) / count($values);

        return sqrt($variance);
    }
}
