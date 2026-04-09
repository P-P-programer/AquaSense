<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SurveyResponse;
use App\Services\ReverseGeocodingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class SurveyController extends Controller
{
    private const EDUCATION_LEVELS = [
        'primaria',
        'bachillerato',
        'profesional',
        'postgrado',
    ];

    public function __construct(
        private readonly ReverseGeocodingService $reverseGeocodingService,
    ) {
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:150'],
            'document_id' => ['required', 'string', 'max:40'],
            'selected_city' => ['required', 'string', 'max:100'],
            'education_level' => ['required', Rule::in(self::EDUCATION_LEVELS)],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'notifications_enabled' => ['required', 'boolean'],
        ]);

        if (! $data['notifications_enabled']) {
            return response()->json([
                'message' => 'Debes activar notificaciones para enviar la encuesta.',
            ], 422);
        }

        $geo = null;

        try {
            $geo = $this->reverseGeocodingService->reverse((float) $data['latitude'], (float) $data['longitude']);
        } catch (\Throwable $exception) {
            Log::warning('Reverse geocoding falló para encuesta (se guarda igual)', [
                'error' => $exception->getMessage(),
            ]);
        }

        $response = SurveyResponse::query()->create([
            'full_name' => $data['full_name'],
            'document_id' => $data['document_id'],
            'selected_city' => $data['selected_city'],
            'education_level' => $data['education_level'],
            'latitude' => $data['latitude'],
            'longitude' => $data['longitude'],
            'notifications_enabled' => $data['notifications_enabled'],
            'geocoded_city' => $geo['city'] ?? null,
            'country' => $geo['country'] ?? null,
            'address' => $geo['address'] ?? null,
            'meta' => [
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
                'ip_hash' => hash('sha256', (string) $request->ip()),
            ],
        ]);

        return response()->json([
            'message' => 'Encuesta registrada correctamente.',
            'data' => [
                'id' => $response->id,
                'created_at' => $response->created_at,
            ],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $limit = min(500, max(10, (int) $request->integer('limit', 200)));

        $rows = SurveyResponse::query()
            ->select([
                'id',
                'full_name',
                'document_id',
                'selected_city',
                'education_level',
                'latitude',
                'longitude',
                'notifications_enabled',
                'geocoded_city',
                'country',
                'address',
                'created_at',
            ])
            ->latest('id')
            ->limit($limit)
            ->get();

        return response()->json($rows);
    }

    public function summary(): JsonResponse
    {
        $total = SurveyResponse::query()->count();

        $byCity = SurveyResponse::query()
            ->select('selected_city', DB::raw('COUNT(*) as total'))
            ->groupBy('selected_city')
            ->orderByDesc('total')
            ->get();

        $byEducation = SurveyResponse::query()
            ->select('education_level', DB::raw('COUNT(*) as total'))
            ->groupBy('education_level')
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'total' => $total,
            'by_city' => $byCity,
            'by_education' => $byEducation,
        ]);
    }
}
