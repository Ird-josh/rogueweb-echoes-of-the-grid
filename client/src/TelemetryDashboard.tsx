import { useEffect, useState, type CSSProperties, type FC } from "react";
import { apiRequest } from "./backend";

interface TelemetryDashboardProps {
  onClose: () => void;
}

const ITEMS_PER_PAGE = 8;

interface TelemetryRecord {
  id: string;
  player_name: string;
  character_id: string;
  new_game_plus: boolean;
  status: "victory" | "defeat" | "abandoned";
  floor: number;
  kills: number;
  duration_seconds: number;
  inventory: unknown;
  created_at: string;
}

interface TelemetryPage {
  records: TelemetryRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const TelemetryDashboard: FC<TelemetryDashboardProps> = ({ onClose }) => {
  const [page, setPage] = useState(1);
  const [telemetry, setTelemetry] = useState<TelemetryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const totalPages = Math.max(1, telemetry?.totalPages ?? 1);

  useEffect(() => {
    let active = true;
    void apiRequest<TelemetryPage>(`/api/telemetry?page=${page}&pageSize=${ITEMS_PER_PAGE}`, {}, true).then(
      (result) => {
        if (active) setTelemetry(result);
      },
      (reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "No se pudo cargar el historial.");
      },
    ).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [page]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const changePage = (nextPage: number) => {
    setLoading(true);
    setError(null);
    setPage(nextPage);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(5, 0, 2, 0.9)",
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      <div
        style={{
          width: "95%",
          maxWidth: "840px",
          background: "linear-gradient(180deg, #180406 0%, #080102 100%)",
          border: "3px solid #dc2626",
          outline: "1px solid #f8fafc",
          outlineOffset: "-6px",
          padding: "24px",
          color: "#f8fafc",
          boxShadow: "0 0 35px rgba(220, 38, 38, 0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", color: "#ef4444", textShadow: "1px 1px 0 #000" }}>
              ✟ REGISTRO HISTÓRICO DE TELEMETRÍA (LIBRO DE LAS ALMAS)
            </h2>
            <span style={{ fontSize: "12px", color: "#fca5a5" }}>
              Partidas guardadas: {(telemetry?.total ?? 0).toLocaleString()} · Datos desde Supabase
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px",
              backgroundColor: "#991b1b",
              color: "#fff",
              border: "2px solid #fff",
              cursor: "pointer",
              fontWeight: "bold",
              fontFamily: "inherit",
            }}
          >
            ✕ CERRAR
          </button>
        </div>

        {error && <p role="alert" style={{ color: "#fca5a5", marginBottom: 12 }}>{error}</p>}
        {loading && <p role="status" style={{ color: "#facc15", marginBottom: 12 }}>Cargando partidas…</p>}
        <div style={{ width: "100%", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ backgroundColor: "#450a0a", borderBottom: "2px solid #ef4444" }}>
              <th style={cellStyle}>ID Partida</th>
              <th style={cellStyle}>Jugador</th>
              <th style={cellStyle}>Piso</th>
              <th style={cellStyle}>Bajas</th>
              <th style={cellStyle}>Tiempo</th>
              <th style={cellStyle}>Resultado · Inventario</th>
            </tr>
          </thead>
          <tbody>
            {telemetry?.records.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid rgba(220,38,38,0.25)" }}>
                <td style={cellStyle}>{row.id.slice(0, 8)}</td>
                <td style={cellStyle}>{row.player_name} · {row.character_id}{row.new_game_plus ? " · NG+" : ""}</td>
                <td style={{ ...cellStyle, color: "#facc15" }}>Nv. {row.floor}</td>
                <td style={{ ...cellStyle, color: "#ef4444", fontWeight: "bold" }}>{row.kills}</td>
                <td style={cellStyle}>{formatDuration(row.duration_seconds)}</td>
                <td style={{ ...cellStyle, color: "#fca5a5", fontSize: "11px" }}>
                  {row.status} · {JSON.stringify(row.inventory)}
                </td>
              </tr>
            ))}
            {!loading && telemetry?.records.length === 0 && (
              <tr><td style={cellStyle} colSpan={6}>Todavía no hay partidas guardadas.</td></tr>
            )}
          </tbody>
        </table>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "18px",
          }}
        >
          <button
            disabled={page === 1}
            onClick={() => changePage(Math.max(1, page - 1))}
            style={pageBtnStyle}
          >
            ◀ ANTERIOR
          </button>
          <span aria-live="polite" style={{ fontSize: "13px", fontWeight: "bold", color: "#fca5a5" }}>
            Página {page.toLocaleString()} de {totalPages.toLocaleString()}
          </span>
          <button
          disabled={page === totalPages || loading}
            onClick={() => changePage(Math.min(totalPages, page + 1))}
            style={pageBtnStyle}
          >
            SIGUIENTE ▶
          </button>
        </div>
      </div>
    </div>
  );
};

const cellStyle: CSSProperties = { padding: "9px 8px", textAlign: "left" };
const pageBtnStyle: CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "#7f1d1d",
  color: "#ffffff",
  border: "1px solid #ffffff",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: "bold",
};