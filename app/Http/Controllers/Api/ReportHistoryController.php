<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReportActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportHistoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'scope' => 'nullable|in:mine,all',
            'action_type' => 'nullable|in:export,ia_summary',
            'format' => 'nullable|in:xlsx,docx',
            'limit' => 'nullable|integer|min:1|max:100',
            'user_id' => 'nullable|integer', // Admin filter by user
        ]);

        $query = ReportActivity::query()->with('user:id,name,email,role');

        // Scope: admin sees all, user sees only own
        if (! $user->isAdmin() || ($data['scope'] ?? 'mine') !== 'all') {
            $query->where('user_id', $user->id);
        } elseif ($user->isAdmin() && ! empty($data['user_id'])) {
            // Admin filtering by specific user
            $query->where('user_id', $data['user_id']);
        }

        if (! empty($data['action_type'])) {
            $query->where('action_type', $data['action_type']);
        }

        if (! empty($data['format'])) {
            $query->where('format', $data['format']);
        }

        $items = $query->latest()->limit($data['limit'] ?? 20)->get()->map(function (ReportActivity $activity) {
            return [
                'id' => $activity->id,
                'user' => [
                    'id' => $activity->user?->id,
                    'name' => $activity->user?->name,
                    'email' => $activity->user?->email,
                    'role' => $activity->user?->role,
                ],
                'action_type' => $activity->action_type,
                'format' => $activity->format,
                'metric' => $activity->metric,
                'granularity' => $activity->granularity,
                'rows_count' => $activity->rows_count,
                'file_name' => $activity->file_name,
                'summary_text' => $activity->summary_text,
                'status' => $activity->status,
                'filters' => $activity->filters,
                'created_at' => $activity->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'items' => $items,
            'meta' => [
                'scope' => $user->isAdmin() && ($data['scope'] ?? 'mine') === 'all' ? 'all' : 'mine',
                'count' => $items->count(),
            ],
        ]);
    }

    /**
     * Descarga un reporte exportado con validación de acceso
     * Solo el usuario dueño o admin pueden descargar
     */
    public function downloadExport(string $activityId, Request $request)
    {
        $user = $request->user();
        
        $activity = ReportActivity::findOrFail($activityId);
        
        // Validar acceso: user solo su propio, admin todo
        if (! $user->isAdmin() && $activity->user_id !== $user->id) {
            abort(403, 'No tienes permiso para descargar este archivo.');
        }
        
        // Validar que sea un export (no IA summary)
        if ($activity->action_type !== 'export' || ! $activity->file_name) {
            abort(404, 'Archivo no disponible.');
        }
        
        // Descargar el archivo
        return 
            \Illuminate\Support\Facades\Storage::disk('public')->download(
            'reportes/' . $activity->file_name,
            $activity->file_name
        );
    }
}
