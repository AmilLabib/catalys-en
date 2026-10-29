import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";

type Props = {
  yourScore?: number;
  industryAvg?: number;
};

const BenchmarkChart: React.FC<Props> = ({
  yourScore = 75,
  industryAvg = 65,
}) => {
  const data = [
    { name: "Your Score", value: yourScore },
    { name: "Industry Avg", value: industryAvg },
  ];

  const colors = ["#012a3d", "#9cb2c1"]; // tone navy: gelap = Anda, terang = pasar

  return (
    <div className="w-full h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: 6, bottom: 6 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" barSize={36} radius={[6, 6, 6, 6]}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BenchmarkChart;
