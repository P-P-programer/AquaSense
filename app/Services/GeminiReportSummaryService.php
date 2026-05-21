<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiReportSummaryService
{
    public function generateSummary(string $systemPrompt, string $userPrompt): string
    {
        $apiKey = (string) config('services.gemini.api_key', '');
        $model = (string) config('services.gemini.model', 'gemini-2.5-flash');
        $baseUrl = rtrim((string) config('services.gemini.base_url', 'https://generativelanguage.googleapis.com'), '/');
        $timeout = (int) config('services.gemini.timeout_seconds', 20);
        $temperature = (float) config('services.gemini.temperature', 0.2);
        $maxOutputTokens = (int) config('services.gemini.max_output_tokens', 900);

        if ($apiKey === '') {
            throw new RuntimeException('Gemini API key no configurada.');
        }

        $response = Http::timeout($timeout)
            ->withHeaders([
                'Content-Type' => 'application/json',
                'X-goog-api-key' => $apiKey,
            ])
            ->post("{$baseUrl}/v1beta/models/{$model}:generateContent", [
                'contents' => [
                    [
                        'parts' => [
                            [
                                'text' => $systemPrompt."\n\n".$userPrompt,
                            ],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => $temperature,
                    'maxOutputTokens' => $maxOutputTokens,
                ],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Error invocando Gemini: HTTP '.$response->status());
        }

        $text = (string) data_get($response->json(), 'candidates.0.content.parts.0.text', '');
        $text = trim($text);

        if ($text === '') {
            throw new RuntimeException('Gemini devolvió una respuesta vacía.');
        }

        return $text;
    }
}