<?php

namespace Tests\Feature;

use App\Models\RfidCard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RfidAccessValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_allows_registered_active_cards(): void
    {
        $card = RfidCard::create([
            'uid' => '6400A75FB3',
            'label' => 'Prueba de carnet',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/access/rfid/validate', [
            'uid' => '6400A75FB3',
        ]);

        $response->assertOk();
        $response->assertJson([
            'allowed' => true,
            'uid' => '6400A75FB3',
        ]);

        $this->assertNotNull($card->fresh()->last_seen_at);
    }

    public function test_it_denies_unknown_cards(): void
    {
        $response = $this->postJson('/api/access/rfid/validate', [
            'uid' => 'ABCDEF1234',
        ]);

        $response->assertOk();
        $response->assertJson([
            'allowed' => false,
            'uid' => 'ABCDEF1234',
        ]);
    }
}