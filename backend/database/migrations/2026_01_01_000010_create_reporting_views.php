<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("DROP VIEW IF EXISTS article_earnings_summary");
        DB::statement("
            CREATE VIEW article_earnings_summary AS
            SELECT
              a.id AS article_id,
              a.creator_id,
              a.title,
              COALESCE(SUM(CASE WHEN p.payment_type = 'unlock' AND p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS unlock_revenue,
              COALESCE(SUM(CASE WHEN p.payment_type = 'tip' AND p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS tip_revenue,
              COUNT(DISTINCT u.id) AS unlock_count,
              COUNT(DISTINCT t.id) AS tip_count
            FROM articles a
            LEFT JOIN payments p ON p.article_id = a.id
            LEFT JOIN unlocks u ON u.article_id = a.id
            LEFT JOIN tips t ON t.article_id = a.id
            GROUP BY a.id, a.creator_id, a.title
        ");

        DB::statement("DROP VIEW IF EXISTS creator_earnings_summary");
        DB::statement("
            CREATE VIEW creator_earnings_summary AS
            SELECT
              cp.user_id AS creator_id,
              cp.total_earned,
              cp.unlock_earned,
              cp.tip_earned,
              cp.referral_earned,
              COUNT(DISTINCT a.id) AS article_count
            FROM creator_profiles cp
            LEFT JOIN articles a ON a.creator_id = cp.user_id AND a.status = 'published'
            GROUP BY cp.user_id, cp.total_earned, cp.unlock_earned, cp.tip_earned, cp.referral_earned
        ");

        DB::statement("DROP VIEW IF EXISTS agent_performance_summary");
        DB::statement("
            CREATE VIEW agent_performance_summary AS
            SELECT
              ag.id AS agent_id,
              ag.name,
              ag.service_type,
              ag.quality_score,
              ag.reliability_score,
              ag.total_jobs,
              ag.total_earned,
              ag.rank_title,
              (0.30 * LEAST(ag.total_jobs, 100) +
               0.25 * ag.quality_score +
               0.20 * ag.reliability_score +
               0.15 * (1000.0 / GREATEST(ag.avg_response_ms, 1)) +
               0.10 * ag.quality_score) AS performance_score
            FROM agents ag
        ");

        DB::statement("DROP VIEW IF EXISTS referral_summary");
        DB::statement("
            CREATE VIEW referral_summary AS
            SELECT
              r.referrer_user_id,
              SUM(CASE WHEN r.status = 'active' THEN 1 ELSE 0 END) AS active_referrals,
              COALESCE(SUM(rr.amount), 0) AS total_referral_rewards
            FROM referrals r
            LEFT JOIN referral_rewards rr ON rr.referral_id = r.id
            GROUP BY r.referrer_user_id
        ");

        DB::statement("DROP VIEW IF EXISTS feed_items");
        DB::statement("
            CREATE VIEW feed_items AS
            SELECT
              a.id,
              a.creator_id,
              u.username AS creator_username,
              u.display_name AS creator_display_name,
              a.title,
              a.slug,
              a.preview,
              a.category,
              a.unlock_price,
              a.is_paid,
              a.ai_assisted,
              a.published_at,
              COALESCE(unlock_stats.unlock_count, 0) AS unlock_count,
              COALESCE(tip_stats.tip_count, 0) AS tip_count
            FROM articles a
            JOIN users u ON u.id = a.creator_id
            LEFT JOIN (
              SELECT article_id, COUNT(*) AS unlock_count FROM unlocks GROUP BY article_id
            ) unlock_stats ON unlock_stats.article_id = a.id
            LEFT JOIN (
              SELECT article_id, COUNT(*) AS tip_count FROM tips GROUP BY article_id
            ) tip_stats ON tip_stats.article_id = a.id
            WHERE a.status = 'published'
        ");
    }

    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS feed_items');
        DB::statement('DROP VIEW IF EXISTS referral_summary');
        DB::statement('DROP VIEW IF EXISTS agent_performance_summary');
        DB::statement('DROP VIEW IF EXISTS creator_earnings_summary');
        DB::statement('DROP VIEW IF EXISTS article_earnings_summary');
    }
};
