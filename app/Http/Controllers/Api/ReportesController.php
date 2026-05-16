<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\ReportesService;

class ReportesController extends Controller
{
    public function __construct(private readonly ReportesService $reportesService)
    {
    }

    public function query(Request $request)
    {
        $data = $request->validate([
            'metric' => 'required|string',
            'granularity' => 'nullable|in:day,week,month,year',
            'start' => 'nullable|date',
            'end' => 'nullable|date',
            'device_id' => 'nullable|integer',
            'city_id' => 'nullable|integer',
        ]);

        return response()->json($this->reportesService->consultar($data, $request->user()));
    }

    public function export(Request $request)
    {
        $data = $request->validate([
            'format' => 'required|in:xlsx,docx',
            'metric' => 'required|string',
            'granularity' => 'nullable|in:day,week,month,year',
            'start' => 'nullable|date',
            'end' => 'nullable|date',
            'device_id' => 'nullable|integer',
            'city_id' => 'nullable|integer',
        ]);

        return response()->json($this->reportesService->exportar($data, $request->user()));
    }

    public function iaResumen(Request $request)
    {
        $data = $request->validate([
            'metric' => 'required|string',
            'granularity' => 'nullable|in:day,week,month,year',
            'start' => 'nullable|date',
            'end' => 'nullable|date',
            'device_id' => 'nullable|integer',
            'city_id' => 'nullable|integer',
        ]);

        return response()->json($this->reportesService->generarResumenIa($data, $request->user()));
    }
}
