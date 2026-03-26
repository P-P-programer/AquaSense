import ChartComponent from "./ChartComponent";
import TableComponent from "./TableComponent";
import StatsComponent from "./StatsComponent";

export default function DashboardPage() {
  return (
    <div className="container mt-4">
      <h2>Dashboard</h2>
      <StatsComponent />
      <div className="row">
        <div className="col-md-6">
          <ChartComponent />
        </div>
        <div className="col-md-6">
          <TableComponent />
        </div>
      </div>
    </div>
  );
}