import { formatTrendLabel } from "@/lib/adminMonitoring";
import { trpc } from "@/lib/trpc";
import { ArrowDownRight, ArrowUpRight, Flame, Minus, ShoppingBag, Trophy } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TrendPoint = { day: string; total: number };
export type ProductPopularity = {
  productId: string;
  name: string;
  requestedQuantity: number;
  requestCount: number;
};

const CHART_COLOR = "#3e4f3b";
const AXIS_TICK = { fill: "#62645f", fontSize: 10 };
/** Keeps the shortest leaderboard bar visible. */
const MIN_BAR_PERCENT = 6;

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const submissions = data.reduce((total, point) => total + point.total, 0);

  return (
    <section className="trend-card" aria-label="Daily order request trend">
      <div className="trend-card-head">
        <div>
          <p className="eyebrow">Request trend</p>
          <h2>Daily submissions</h2>
        </div>
        <span>{submissions} submissions</span>
      </div>
      {data.length ? (
        <div className="trend-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="requestTrend" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.42} />
                  <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tickFormatter={formatTrendLabel}
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK}
                minTickGap={28}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <Tooltip
                labelFormatter={formatTrendLabel}
                formatter={(value: number) => [`${value} requests`, "Submitted"]}
                contentStyle={{ border: "1px solid rgba(21,23,26,.17)", borderRadius: 0, fontSize: 11 }}
              />
              <Area type="monotone" dataKey="total" stroke={CHART_COLOR} strokeWidth={2} fill="url(#requestTrend)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="trend-empty">No submissions for this scope.</div>
      )}
    </section>
  );
}

/** Period-over-period change shown under each status total. `null` means there was nothing to compare against. */
export function ChangeIndicator({ change, label }: { change: number | null; label: string }) {
  if (change === null) {
    return (
      <small className="summary-change neutral">
        <Minus size={11} /> New in scope
      </small>
    );
  }

  const direction = change > 0 ? "positive" : change < 0 ? "negative" : "neutral";
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  return (
    <small className={`summary-change ${direction}`}>
      <Icon size={11} /> {change > 0 ? "+" : ""}
      {change}% vs {label}
    </small>
  );
}

export function PopularityPanel({ products }: { products: ProductPopularity[] }) {
  return (
    <section className="popularity-card" aria-label="Top requested products">
      <div className="popularity-card-head">
        <div>
          <p className="eyebrow">Demand signal</p>
          <h2>Top requested pieces</h2>
        </div>
        <Trophy size={19} strokeWidth={1.4} />
      </div>
      {products.length ? (
        <ol className="popularity-list">
          {products.map((product, index) => (
            <li key={product.productId}>
              <span className="popularity-rank">{String(index + 1).padStart(2, "0")}</span>
              <span className="popularity-name">
                <strong>{product.name}</strong>
                <small>
                  {product.requestCount} {product.requestCount === 1 ? "request" : "requests"}
                </small>
              </span>
              <b>{product.requestedQuantity}×</b>
            </li>
          ))}
        </ol>
      ) : (
        <div className="popularity-empty">No requested pieces match this view.</div>
      )}
      <p className="popularity-note">Ranked by requested quantity in order requests.</p>
    </section>
  );
}

export function AddToBagTelemetryPanel() {
  const stats = trpc.analytics.getStats.useQuery().data;
  const topProducts = stats?.topProducts ?? [];
  const highestCount = Math.max(...topProducts.map(product => product.count), 1);

  return (
    <section className="analytics-telemetry-card" aria-label="Add to bag real-time tracking">
      <div className="analytics-telemetry-head">
        <div>
          <p className="eyebrow">Real-Time Intent Tracking</p>
          <h2>Add-to-Bag Telemetry</h2>
        </div>
        <div className="telemetry-badges">
          <span className="telemetry-stat-badge">
            <Flame size={13} /> Today: <strong>{stats?.todayAddToBag || 0}</strong>
          </span>
          <span className="telemetry-stat-badge">
            <ShoppingBag size={13} /> Total: <strong>{stats?.totalAddToBag || 0}</strong>
          </span>
        </div>
      </div>

      {topProducts.length > 0 ? (
        <div className="telemetry-leaderboard">
          <p className="telemetry-lead-title">Most Added Pieces to Bag</p>
          <div className="telemetry-bars">
            {topProducts.map((product, index) => {
              const percent = Math.max(Math.round((product.count / highestCount) * 100), MIN_BAR_PERCENT);
              return (
                <div className="telemetry-bar-row" key={product.productId || index}>
                  <div className="telemetry-bar-meta">
                    <strong>{product.productName}</strong>
                    <span>{product.count} adds</span>
                  </div>
                  <div className="telemetry-bar-track">
                    <div className="telemetry-bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="telemetry-empty">
          <ShoppingBag size={24} strokeWidth={1.25} />
          <p>Add-to-bag events will stream here live as visitors explore the collection.</p>
        </div>
      )}
    </section>
  );
}
