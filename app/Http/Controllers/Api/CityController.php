<?php

namespace App\Http\Controllers\Api;

use App\Models\City;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CityController extends Controller
{
    /**
     * List all cities, optionally filtered by department or country.
     *
     * Query parameters:
     *   - department: Filter by department name (e.g., 'Tolima')
     *   - country: Filter by country (default: 'Colombia')
     *
     * Returns: Array of cities with name, department, coordinates.
     */
    public function index(Request $request)
    {
        $query = City::query();

        if ($request->has('department')) {
            $query->where('department', $request->input('department'));
        }

        if ($request->has('country')) {
            $query->where('country', $request->input('country'));
        } else {
            // Default to Colombia if not specified
            $query->where('country', 'Colombia');
        }

        return response()->json(
            $query->orderBy('department')->orderBy('name')->get([
                'id',
                'name',
                'department',
                'country',
                'dane_code',
                'latitude',
                'longitude',
            ])
        );
    }

    /**
     * Get a specific city by ID.
     */
    public function show(City $city)
    {
        return response()->json($city);
    }
}
