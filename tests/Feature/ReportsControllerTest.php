<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_query_requires_auth()
    {
        $response = $this->postJson('/api/reports/query', ['metric' => 'ph']);
        $response->assertStatus(419)->or($response->assertStatus(401));
    }
}
