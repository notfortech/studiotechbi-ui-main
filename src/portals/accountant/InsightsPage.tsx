import { useState } from "react";
import { getAIInsights } from "../../services/aiService";
import { useAuth } from "../../auth/AuthContext";
import { authService } from "../../services/authService";

export function InsightsPage() {
  const { user } = useAuth();
  const token = authService.getStoredToken();

  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);

      if (!token) {
        throw new Error("Not authenticated");
      }

      const data = await getAIInsights(token, {
        periodType: "monthly",
        period: "2026-03",
        clientCode: user?.clientCode
      });

      setInsights(data);
      setOpen(true);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  // 🔒 Hide if not subscribed
  if (!user?.hasAIInsights) return null;

  return (
    <div style={{ display: "flex" }}>
      
      {/* LEFT: Your existing content */}
      <div style={{ flex: 1 }}>
        <button onClick={handleGenerate}>
          {loading ? "Generating..." : "✨ Generate AI Insights"}
        </button>
      </div>

      {/* RIGHT: Copilot Panel */}
      {open && (
        <div style={{
          width: "350px",
          borderLeft: "1px solid #ddd",
          padding: "16px"
        }}>
          <h3>AI Copilot</h3>

          {!insights && <p>No insights yet</p>}

          {insights && (
            <>
              <h4>Summary</h4>
              <p>{insights.summary}</p>

              <h4>Key Insights</h4>
              <ul>
                {insights.keyInsights?.map((i: string, idx: number) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>

              <h4>Risks</h4>
              <ul>
                {insights.risks?.map((r: string, idx: number) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>

              <h4>Recommendations</h4>
              <ul>
                {insights.recommendations?.map((r: string, idx: number) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default InsightsPage;