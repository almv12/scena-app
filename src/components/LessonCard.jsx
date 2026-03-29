export default function LessonCard({ time, timeSub, name, sub, badge, badgeType, progress, onClick }) {
  return (
    <div className={`card ${onClick ? 'card-click' : ''}`} onClick={onClick}>
      <div className="lesson">
        <div>
          <div className="lesson-time">{time}</div>
          {timeSub && <div className="lesson-time-sub">{timeSub}</div>}
        </div>
        <div className="lesson-divider" />
        <div className="lesson-info">
          <div className="lesson-name">{name}</div>
          <div className="lesson-sub">{sub}</div>
          {progress !== undefined && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: progress + '%' }} />
            </div>
          )}
        </div>
        {badge && (
          <span className={`badge badge-${badgeType || 'upcoming'}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}
