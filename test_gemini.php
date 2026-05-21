<?php
try {
    $service = app(App\Services\GeminiReportSummaryService::class);
    echo $service->generateSummary('Responde en una linea en español.', 'Estado pH estable.');
} catch (\Throwable $e) {
    echo 'ERROR: ' . $e->getMessage();
}
