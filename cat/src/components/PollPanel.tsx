import { useState } from "react";
import type { LivePoll, PollChoice } from "../../shared/types.ts";

const CHOICES: PollChoice[] = ["A", "B", "C", "D"];

type PollPanelProps = {
  poll: LivePoll | null;
  myChoice: PollChoice | null;
  isInstructor: boolean;
  sessionOpen: boolean;
  onStart: (question: string, optionLabels: Partial<Record<PollChoice, string>>) => void;
  onLock: () => void;
  onClear: () => void;
  onVote: (choice: PollChoice) => void;
};

export function PollPanel({
  poll,
  myChoice,
  isInstructor,
  sessionOpen,
  onStart,
  onLock,
  onClear,
  onVote,
}: PollPanelProps) {
  const [question, setQuestion] = useState("");
  const [labels, setLabels] = useState<Record<PollChoice, string>>({
    A: "",
    B: "",
    C: "",
    D: "",
  });

  if (!sessionOpen) {
    return null;
  }

  const maxCount = poll ? Math.max(1, ...CHOICES.map((key) => poll.counts[key])) : 1;

  return (
    <section className="poll-panel" aria-label="Live poll">
      <div className="poll-panel__header">
        <h2>Live poll</h2>
        <p className="poll-panel__hint">
          Anonymous · anyone connected can vote · bars update for everyone
        </p>
      </div>

      {isInstructor && !poll ? (
        <form
          className="poll-compose"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = question.trim();
            if (!trimmed) {
              return;
            }
            onStart(trimmed, labels);
            setQuestion("");
          }}
        >
          <label>
            Question
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="e.g. Which step uses the CLT?"
              maxLength={240}
            />
          </label>
          <div className="poll-compose__options">
            {CHOICES.map((key) => (
              <label key={key}>
                {key} (optional label)
                <input
                  value={labels[key]}
                  onChange={(event) =>
                    setLabels((current) => ({ ...current, [key]: event.target.value }))
                  }
                  placeholder={`Option ${key}`}
                  maxLength={80}
                />
              </label>
            ))}
          </div>
          <button type="submit" className="primary-button" disabled={!question.trim()}>
            Start poll
          </button>
        </form>
      ) : null}

      {poll ? (
        <div className="poll-live">
          <p className="poll-live__question">{poll.question}</p>
          <p className="poll-live__meta">
            {poll.status === "open" ? "Voting open" : "Voting locked"} · {poll.totalVotes} vote
            {poll.totalVotes === 1 ? "" : "s"}
            {myChoice ? ` · you chose ${myChoice}` : ""}
          </p>

          <div className="poll-bars" role="img" aria-label="Vote counts">
            {CHOICES.map((key) => {
              const count = poll.counts[key];
              const pct = Math.round((count / maxCount) * 100);
              const label = poll.optionLabels[key];
              return (
                <div key={key} className="poll-bar-row">
                  <button
                    type="button"
                    className={
                      myChoice === key
                        ? "poll-choice poll-choice--mine"
                        : "poll-choice"
                    }
                    disabled={poll.status !== "open"}
                    onClick={() => onVote(key)}
                  >
                    <strong>{key}</strong>
                    {label ? <span>{label}</span> : null}
                  </button>
                  <div className="poll-bar-track" aria-hidden="true">
                    <div className="poll-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="poll-bar-count">{count}</span>
                </div>
              );
            })}
          </div>

          {isInstructor ? (
            <div className="poll-live__actions">
              {poll.status === "open" ? (
                <button type="button" className="ghost-button" onClick={onLock}>
                  Lock voting
                </button>
              ) : null}
              <button type="button" className="ghost-button" onClick={onClear}>
                Clear poll
              </button>
            </div>
          ) : poll.status === "open" ? (
            <p className="poll-live__tip">Tap A–D to vote. You can change your answer until locked.</p>
          ) : (
            <p className="poll-live__tip">Voting is locked. Discuss the results.</p>
          )}
        </div>
      ) : !isInstructor ? (
        <p className="poll-panel__waiting">Waiting for the instructor to start a poll…</p>
      ) : null}
    </section>
  );
}
