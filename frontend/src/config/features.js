/** 화면 둘러보기는 허용하고 개인 데이터·변경 작업은 로그인 후 제공합니다. */
export const REQUIRE_AUTH = false;
// The server determines the fill price. Enable after verifying the target test deployment.
export const ENABLE_ORDER_SUBMISSION = import.meta.env.VITE_ENABLE_ORDER_SUBMISSION === 'true';

export default { REQUIRE_AUTH };
