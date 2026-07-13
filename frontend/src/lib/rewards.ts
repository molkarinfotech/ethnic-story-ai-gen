/**
 * Rewards system constants and helpers
 * Points are awarded server-side via Supabase service role → award_points() RPC
 */

export const POINT_VALUES = {
  signup:   50,
  like:     10,
  review:   25,
  feedback: 20,
  purchase: 0, // calculated: floor(amount_aud) points per $1 spent → set in webhook
} as const;

export type RewardAction = keyof typeof POINT_VALUES;

/** How many dollars is 1 point worth (for redemption UI) */
export const POINTS_PER_DOLLAR = 100; // 100pts = $1 discount

/** Display label for a reward action */
export const ACTION_LABELS: Record<RewardAction, string> = {
  signup:   'Welcome bonus',
  like:     'Liked a product',
  review:   'Verified purchase review',
  feedback: 'Site feedback',
  purchase: 'Purchase reward',
};
