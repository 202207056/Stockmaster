# Shared news brief and holdings board

The holdings board and the trading AI news dialog render `NewsSummaryBody` from the same public stock brief. Both preserve the three sections: 최근 확인되는 뉴스, 긍정적으로 볼 수 있는 요인, and 주의해서 볼 수 있는 요인. Each section retains its own text, including text that also appears in another category. Evidence links remain visible. The account-specific fallback headline has been removed so a public news banner cannot show a different private summary.

The backend portfolio endpoint obtains `StockBriefService.get(symbol)` first. It passes that snapshot's evidence to the personal analysis, asks the AI server for guesses only, and embeds the public snapshot in `news_brief` in the saved portfolio result. Legacy news fields also contain the same public text for compatibility; unused sections are empty. The public snapshot includes its own generation timestamp. Historical records retain the original snapshot instead of being rewritten when current news changes. Existing records without `news_brief` remain readable in history.

Deploy the AI server (optional `guesses_only` request field), then the backend, then the frontend. JSON storage needs no database migration. These changes have been verified locally; no remote deployment or live-data migration was performed.

## Holdings UI

- Follows the two supplied briefing reference images and the existing Pretendard/font and color system; no random design direction was drawn for this bounded component change.
- Shows every holding, grouped by topics identified in the canonical news text. This is news-topic grouping, not exchange industry or provider theme membership. Unmatched content is labeled 기타 뉴스.
- At most three topic columns across the desktop overview, with the original five cards per column restored. Additional columns are reached by horizontal scrolling or 더보기. Selecting a card expands from its original bounds and moves the remaining cards using measured positions. Reduced-motion settings disable these transitions.
- Lines connect consecutive holdings in a known news topic and held stocks explicitly listed as related in the public brief. Unclassified holdings are not connected just because they share the fallback group. Connections follow measured card positions during expansion, scrolling and resizing.
- On a phone the detail stacks above the sideways card list. Closing or pressing Escape returns focus to the original card.
- Personal guesses keep their source links, copy actions and generation time. Generation is explicit; opening the board fetches public news but does not automatically generate private guesses.
- The screenshot fixture under `frontend/tests/fixtures/brief-review.*` uses labeled sample holdings and news exclusively for local visual regression. It is not imported by the application or included in its default production build.

## Validation

Checked shared response/storage content, evidence input, cross-symbol rejection, failure behavior, current and legacy records, source links, history deletion, complete holdings lists and topic grouping. Browser checks cover matching body text in both screens, diagonal expansion, sibling motion, horizontal paging, focus restoration, reduced motion and layouts at 1440, 768 and 390 pixels. The production fixture passed the design inspector with no failures or warnings.

An unrelated existing assets-tour test still expects six targets (`flow` and `portfolio` separately), while the current tour has five with a combined `charts` step. Its failure was left outside this change.
