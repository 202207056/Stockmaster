/** 화면 둘러보기는 허용하고 개인 데이터·변경 작업은 로그인 후 제공합니다. */
export const REQUIRE_AUTH = false;
// Temporary QA mode: reopen the chart introduction on every graph-type interaction.
// Set false to restore first-use-only behavior without deleting saved progress.
export const ALWAYS_SHOW_CHART_TUTORIAL = true;
export const ALWAYS_SHOW_BUY_TUTORIAL = import.meta.env.VITE_REPEAT_BUY_TUTORIAL !== 'false';
// The server determines the fill price. Enable after verifying the target test deployment.
export const ENABLE_ORDER_SUBMISSION = import.meta.env.VITE_ENABLE_ORDER_SUBMISSION === 'true';

export default { REQUIRE_AUTH };
