import React, { useEffect, useState } from 'react';
import {
  Users,
  Award,
  MessageSquare,
  Flag,
  Send,
  AlertTriangle,
  Compass,
  Trophy,
  WifiOff,
  Check,
} from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { useProgress } from '../progress/progressStore';
import {
  CommunityPost,
  CommunityFlagEntry,
  validateCommunityNickname,
} from '../community/communityValidation';
import { Button } from '../design';
import { gameAudio } from '../game/utils/gameAudio';

interface CommunityViewProps {
  language: Language;
  onOpenTargetInViewer: (caseId: string) => void;
}

type CommunityTab = 'feed' | 'ranks' | 'flags';

interface ScoreEntry {
  nickname: string;
  xp: number;
  rank: string;
  updatedAt: string;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  language,
  onOpenTargetInViewer,
}) => {
  const isRtl = language === 'ar';
  const t = translations[language];
  const { progress, rank, rankInfo } = useProgress();

  const [tab, setTab] = useState<CommunityTab>('feed');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [serverFlags, setServerFlags] = useState<CommunityFlagEntry[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [offline, setOffline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // New Post Composer state
  const [nickname, setNickname] = useState<string>(() => {
    try {
      return localStorage.getItem('spex_community_nick') || 'SkyExplorer';
    } catch {
      return 'SkyExplorer';
    }
  });
  const [target, setTarget] = useState<string>('WISE 0855');
  const [note, setNote] = useState<string>('');
  const [postError, setPostError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Per-post inline comment & report state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [reportedIds, setReportedIds] = useState<Record<string, boolean>>({});
  const [rankSavedBanner, setRankSavedBanner] = useState<boolean>(false);

  const fetchCommunityData = async () => {
    setLoading(true);
    try {
      const [postsRes, flagsRes, scoresRes] = await Promise.all([
        fetch('/api/community/posts'),
        fetch('/api/community/flags'),
        fetch('/api/game/scores'),
      ]);

      const checkJson = async (r: Response) => {
        if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      };

      const [postsJson, flagsJson, scoresJson] = await Promise.all([
        checkJson(postsRes),
        checkJson(flagsRes),
        checkJson(scoresRes),
      ]);

      setPosts(Array.isArray(postsJson.posts) ? postsJson.posts : []);
      setServerFlags(Array.isArray(flagsJson.flags) ? flagsJson.flags : []);
      setScores(Array.isArray(scoresJson.scores) ? scoresJson.scores : []);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const persistNick = (val: string) => {
    setNickname(val);
    try {
      localStorage.setItem('spex_community_nick', val);
    } catch {
      // ignore
    }
  };

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const nickCheck = validateCommunityNickname(nickname);
    if (!nickCheck.ok) {
      setPostError(nickCheck.error);
      return;
    }
    if (note.trim().length < 4) {
      setPostError(
        isRtl
          ? 'يرجى كتابة ملاحظة قصيرة (٤ أحرف على الأقل).'
          : 'Please write a brief observation note (at least 4 characters).'
      );
      return;
    }

    setSubmitting(true);
    setPostError(null);
    gameAudio.playClick();

    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickCheck.nickname,
          target: target.trim(),
          note: note.trim(),
          xp: progress.xp,
          rank,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPostError(data.error || 'Could not post right now.');
        return;
      }
      if (data.post) {
        setPosts((prev) => [data.post, ...prev]);
        setNote('');
        gameAudio.playSuccess();
      }
    } catch {
      setOffline(true);
      setPostError(t.communityOfflineNotice);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (text.length < 2) return;
    const nickCheck = validateCommunityNickname(nickname);
    if (!nickCheck.ok) {
      setPostError(nickCheck.error);
      return;
    }
    gameAudio.playClick();
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickCheck.nickname, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.comment) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments: [...(p.comments || []), data.comment] } : p
          )
        );
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      }
    } catch {
      setOffline(true);
    }
  };

  const handleReportPost = async (postId: string) => {
    if (reportedIds[postId]) return;
    gameAudio.playClick();
    setReportedIds((prev) => ({ ...prev, [postId]: true }));
    try {
      await fetch(`/api/community/posts/${encodeURIComponent(postId)}/report`, {
        method: 'POST',
      });
    } catch {
      // ignore offline report failure
    }
  };

  const handlePublishRank = async () => {
    const nickCheck = validateCommunityNickname(nickname);
    if (!nickCheck.ok) {
      setPostError(nickCheck.error);
      return;
    }
    gameAudio.playClick();
    try {
      const res = await fetch('/api/game/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickCheck.nickname,
          xp: progress.xp,
          rank,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.scores)) {
        setScores(data.scores);
        setRankSavedBanner(true);
        gameAudio.playSuccess();
        setTimeout(() => setRankSavedBanner(false), 2500);
      }
    } catch {
      setOffline(true);
    }
  };

  // Deduplicate merged local + backend bad-data flags
  const mergedFlags: CommunityFlagEntry[] = [];
  const seenFlagIds = new Set<string>();
  for (const f of [...progress.badDataReports, ...serverFlags]) {
    const key = `${f.obsId}-${f.x}-${f.y}`;
    if (!seenFlagIds.has(key)) {
      seenFlagIds.add(key);
      mergedFlags.push(f);
    }
  }

  return (
    <div
      className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 ${
        isRtl ? 'font-cairo' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Community Header & 3-Source XP Card */}
      <section className="rounded-2xl bg-[#090F1E]/95 border border-white/10 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-sky-400 font-semibold">
              <Users className="w-4 h-4 shrink-0" />
              <span>{t.communityTitle}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
              {t.communityTitle}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {t.communitySubtitle}
            </p>
          </div>

          <div className="shrink-0 rounded-xl bg-[#050811] border border-white/10 p-4 min-w-[230px] space-y-2">
            <div className="flex items-center justify-between font-mono text-xs tabular-nums">
              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                {rank}
              </span>
              <span className="text-sky-300 font-bold">{progress.xp} XP</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-amber-400"
                style={{ width: `${Math.round(rankInfo.progressRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Separate XP Sources */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs tabular-nums">
          <div className="rounded-xl bg-[#050811] border border-white/10 px-4 py-3 flex items-center justify-between">
            <span className="text-slate-400">{t.xpSourceLearning}</span>
            <span className="text-sky-300 font-bold text-sm">{progress.xpBreakdown.learning} XP</span>
          </div>
          <div className="rounded-xl bg-[#050811] border border-white/10 px-4 py-3 flex items-center justify-between">
            <span className="text-slate-400">{t.xpSourceSolving}</span>
            <span className="text-emerald-300 font-bold text-sm">{progress.xpBreakdown.solving} XP</span>
          </div>
          <div className="rounded-xl bg-[#050811] border border-white/10 px-4 py-3 flex items-center justify-between">
            <span className="text-slate-400">{t.xpSourceGame}</span>
            <span className="text-amber-300 font-bold text-sm">{progress.xpBreakdown.game} XP</span>
          </div>
        </div>
      </section>

      {offline && (
        <div
          role="status"
          className="rounded-xl bg-amber-500/10 border border-amber-400/35 px-4 py-3 flex items-center gap-2.5 text-xs text-amber-200"
        >
          <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{t.communityOfflineNotice}</span>
        </div>
      )}

      {/* Segmented Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#070B16] p-1.5 rounded-xl border border-white/10 w-fit">
        {(
          [
            { id: 'feed' as const, label: t.communityTabFeed, icon: MessageSquare },
            { id: 'ranks' as const, label: t.communityTabRankBoard, icon: Trophy },
            { id: 'flags' as const, label: t.communityTabFlags, icon: AlertTriangle },
          ]
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`community-tab-${item.id}`}
              onClick={() => {
                gameAudio.playClick();
                setTab(item.id);
              }}
              className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer transition ${
                active
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DISCOVERIES FEED */}
      {tab === 'feed' && (
        <div className="space-y-5">
          {/* Composer */}
          <form
            onSubmit={handlePublishPost}
            className="rounded-2xl bg-[#070B16]/95 border border-white/10 p-4 sm:p-5 space-y-3.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs text-slate-300 block">
                <span className="font-mono text-slate-400">{t.communityNicknameLabel}</span>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => persistNick(e.target.value)}
                  maxLength={20}
                  data-testid="community-nickname-input"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#050811] border border-white/15 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </label>

              <label className="space-y-1 text-xs text-slate-300 block">
                <span className="font-mono text-slate-400">{t.communityTargetLabel}</span>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  maxLength={80}
                  data-testid="community-target-input"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#050811] border border-white/15 text-sm text-white focus:outline-none focus:border-sky-400"
                />
              </label>
            </div>

            <label className="space-y-1 text-xs text-slate-300 block">
              <span className="font-mono text-slate-400">{t.communityNoteLabel}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={280}
                data-testid="community-note-input"
                placeholder={
                  isRtl
                    ? 'صف الحركة أو الامتصاص الطيفي أو ملاحظات الجودة...'
                    : 'Describe measured motion, spectral dip, or frame quality notes...'
                }
                className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-white/15 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </label>

            {postError && <p className="text-xs text-rose-300 font-mono">{postError}</p>}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
                data-testid="community-submit-post-btn"
                icon={<Send className="w-3.5 h-3.5" />}
              >
                {t.communityPostBtn}
              </Button>
            </div>
          </form>

          {/* Feed Items */}
          {loading ? (
            <div className="rounded-2xl bg-[#070B16] border border-white/10 p-6 text-center text-xs font-mono text-slate-400">
              {isRtl ? 'جاري التحميل...' : 'Loading community notes...'}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl bg-[#070B16] border border-white/10 p-6 text-center text-xs text-slate-400">
              {isRtl ? 'لا توجد منشورات بعد — كن أول مستكشف!' : 'No notes yet — post the first verified observation!'}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <article
                  key={post.id}
                  data-testid={`community-post-${post.id}`}
                  className="rounded-2xl bg-[#090F1E]/95 border border-white/10 p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                      <span className="font-bold text-white">{post.nickname}</span>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span className="text-amber-300">{post.rank}</span>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span className="text-sky-300 font-semibold">{post.target}</span>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span className="text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {post.caseId && (
                        <button
                          type="button"
                          onClick={() => onOpenTargetInViewer(post.caseId!)}
                          className="text-xs text-sky-300 hover:text-sky-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>{t.navExploreShort}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={Boolean(reportedIds[post.id])}
                        onClick={() => handleReportPost(post.id)}
                        className="text-xs text-slate-400 hover:text-rose-300 disabled:text-rose-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Flag className="w-3 h-3" />
                        <span>{reportedIds[post.id] ? t.communityReportedLabel : t.communityReportBtn}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed">{post.note}</p>

                  {/* Comments */}
                  {post.comments && post.comments.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      {post.comments.map((c) => (
                        <div key={c.id} className="text-xs text-slate-300 bg-[#050811] rounded-lg px-3 py-2">
                          <span className="font-mono font-bold text-amber-300 me-2">{c.nickname}:</span>
                          <span>{c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Inline Reply */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      maxLength={240}
                      placeholder={t.communityCommentPlaceholder}
                      className="flex-1 min-h-[36px] px-3 py-1.5 rounded-xl bg-[#050811] border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddComment(post.id)}
                    >
                      {t.communityCommentBtn}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RANK BOARD */}
      {tab === 'ranks' && (
        <div className="rounded-2xl bg-[#070B16]/95 border border-white/10 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <h2 className="font-display text-lg font-bold text-white">{t.communityTabRankBoard}</h2>
              <p className="text-xs text-slate-400">{t.communityNicknameLabel}</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => persistNick(e.target.value)}
                maxLength={20}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#050811] border border-white/15 text-xs text-white w-40"
              />
              <Button type="button" variant="primary" size="sm" onClick={handlePublishRank}>
                {rankSavedBanner ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {isRtl ? 'تم الحفظ' : 'Saved'}
                  </span>
                ) : isRtl ? (
                  'نشر رتبتي'
                ) : (
                  'Post My Rank'
                )}
              </Button>
            </div>
          </div>

          {scores.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              {isRtl ? 'لم تُسجّل نقاط على الخادم بعد — كن الأول!' : 'No rank scores posted yet — publish yours!'}
            </p>
          ) : (
            <div className="divide-y divide-white/10">
              {scores.map((s, idx) => (
                <div
                  key={`${s.nickname}-${idx}`}
                  className="py-2.5 flex items-center justify-between text-xs font-mono tabular-nums"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 w-6">#{idx + 1}</span>
                    <span className="text-white font-bold">{s.nickname}</span>
                    <span className="text-slate-500" aria-hidden="true">·</span>
                    <span className="text-amber-300">{s.rank}</span>
                  </div>
                  <span className="text-sky-300 font-bold">{s.xp} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BAD-DATA FLAGS */}
      {tab === 'flags' && (
        <div className="rounded-2xl bg-[#070B16]/95 border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display text-lg font-bold text-white">{t.communityTabFlags}</h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {mergedFlags.length} {isRtl ? 'بلاغ' : 'reports'}
            </span>
          </div>

          {mergedFlags.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              {isRtl
                ? 'لا توجد بلاغات بيانات تالفة بعد. استخدم زر «الإبلاغ عن بيانات تالفة» في المستكشف.'
                : 'No bad-data flags yet. Use "Report bad data" inside the Explore viewer to log artifacts.'}
            </p>
          ) : (
            <div className="divide-y divide-white/10">
              {mergedFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-mono text-white font-semibold tabular-nums">
                      {flag.targetName} · {flag.detector} · ({flag.x}, {flag.y})
                    </div>
                    <div className="text-slate-300">{flag.reason}</div>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {flag.obsId} · {new Date(flag.reportedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
