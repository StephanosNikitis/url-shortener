function BreakdownList({ items }) {
    const maxCount = Math.max(1, ...items.map((item) => item.count));
    const total = items.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="breakdown-list">
            {items.map((item) => (
                <div className="breakdown-row" key={item.label}>
                    <span className="breakdown-label">{item.label}</span>
                    <div className="breakdown-bar-track">
                        <div
                            className="breakdown-bar-fill"
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                    </div>
                    <span className="breakdown-count">
                        {item.count}
                        <span className="breakdown-percent">
                            {' '}({total > 0 ? Math.round((item.count / total) * 100) : 0}%)
                        </span>
                    </span>
                </div>
            ))}
        </div>
    );
}

export default BreakdownList;