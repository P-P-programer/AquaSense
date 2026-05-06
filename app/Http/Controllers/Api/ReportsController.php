<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ReportSummary;

class ReportsController extends Controller
{
    public function query(Request $request)
    {
        $data = $request->validate([
            'metric' => 'required|string',
            'granularity' => 'nullable|in:day,week,month,year',
            'start' => 'nullable|date',
            'end' => 'nullable|date',
            'entity_type' => 'nullable|string',
            'entity_id' => 'nullable|integer',
        ]);

        // TODO: implement aggregation/query logic
        return response()->json(['data' => []]);
    }

    public function export(Request $request)
    {
        $data = $request->validate([
            'format' => 'required|in:xlsx,docx',
            'metric' => 'required|string',
        ]);

        // TODO: enqueue export job, return 202 Accepted
        return response()->json(['status' => 'accepted'], 202);
    }
}
