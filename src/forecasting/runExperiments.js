/**
 * Headless Execution Runner for Session 6 Forecasting Experiments
 * Invoked via: npm run experiments
 * 
 * Executes full rolling-origin backtests, bootstrap resamples, surge isolation,
 * depot case studies, and vehicle hours benchmarks.
 * Writes CSV files to ./results/ and logs console summaries.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  runBenchmarkExperiment,
  runDepotCaseStudy,
  runVehicleExperiment,
  generateCSVContent,
  EXPERIMENT_VARIANTS
} from './experiments.js';

async function main() {
  const startTime = performance.now();
  console.log('========================================================================');
  console.log(' Indian Armed Forces Logistics System — Session 6 Experiment Engine');
  console.log(' Running 8 Variants across 90 Benchmark + 99 Depot + 30 Vehicle Series');
  console.log('========================================================================\n');

  const resultsDir = path.resolve(process.cwd(), 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
    console.log(`Created results directory: ${resultsDir}`);
  }

  // 1. Run 90 Benchmark Series
  console.log('1. Running 90 synthetic benchmark series (30 steady, 30 seasonal, 30 spiky)...');
  const benchResults = runBenchmarkExperiment();
  console.log(`   ✓ Benchmark evaluation complete (${benchResults.totalSeries} series x 8 variants).`);

  // 2. Run Depot Logistics Case Study
  console.log('2. Running real depot case study across all 8 depots...');
  const depotResults = runDepotCaseStudy();
  console.log(`   ✓ Depot case study complete (${depotResults.totalDepotSeries} stocked depot-item pairs).`);

  // 3. Run Vehicle Fleet Engine Hours Experiment
  console.log('3. Running tactical fleet engine hours experiment (30 vehicles)...');
  const vehicleResults = runVehicleExperiment();
  console.log(`   ✓ Vehicle maintenance experiment complete (${vehicleResults.totalVehicles} tactical units).`);

  // 4. Generate and write all 7 CSV files
  console.log('\n4. Writing CSV artifacts to ./results/...');
  const csvFiles = [
    { name: 'benchmark_series.csv', content: generateCSVContent('benchmark_series', benchResults) },
    { name: 'results_per_series.csv', content: generateCSVContent('results_per_series', benchResults) },
    { name: 'summary_by_pattern.csv', content: generateCSVContent('summary_by_pattern', benchResults) },
    { name: 'bootstrap_ci.csv', content: generateCSVContent('bootstrap_ci', benchResults) },
    { name: 'surge_analysis.csv', content: generateCSVContent('surge_analysis', benchResults) },
    { name: 'case_study_depots.csv', content: generateCSVContent('case_study_depots', depotResults) },
    { name: 'vehicles.csv', content: generateCSVContent('vehicles', vehicleResults) }
  ];

  for (const file of csvFiles) {
    const filePath = path.join(resultsDir, file.name);
    fs.writeFileSync(filePath, file.content, 'utf-8');
    const bytes = fs.statSync(filePath).size;
    console.log(`   ✓ Written ${file.name.padEnd(24)} (${(bytes / 1024).toFixed(1)} KB)`);
  }

  // 5. Console Summary Table
  console.log('\n========================================================================');
  console.log(' BENCHMARK LEAD-TIME nMAE SUMMARY (Lead Time L = 4 Weeks)');
  console.log('========================================================================');
  console.log('Variant            | Steady (n=30) | Seasonal (30) | Spiky (n=30)  | Overall Wins');
  console.log('-------------------+---------------+---------------+---------------+-------------');

  for (const v of EXPERIMENT_VARIANTS) {
    const steady = benchResults.summaryByPattern.steady[v.id].nmae.mean.toFixed(4);
    const seasonal = benchResults.summaryByPattern.seasonal[v.id].nmae.mean.toFixed(4);
    const spiky = benchResults.summaryByPattern.spiky[v.id].nmae.mean.toFixed(4);
    const wins = String(benchResults.summaryOverall[v.id].wins).padStart(4, ' ');

    console.log(
      `${v.name.padEnd(18)} | Mean: ${steady}  | Mean: ${seasonal}  | Mean: ${spiky}  | Wins: ${wins}/90`
    );
  }

  console.log('\n========================================================================');
  console.log(' SPIKY SERIES SURGE ISOLATION (Error during Surge vs Non-Surge Origins)');
  console.log('========================================================================');
  console.log('Variant            | Surge nMAE    | No-Surge nMAE | Error Inflation Ratio');
  console.log('-------------------+---------------+---------------+----------------------');
  for (const v of EXPERIMENT_VARIANTS) {
    const sa = benchResults.surgeAnalysisSummary[v.id];
    console.log(
      `${v.name.padEnd(18)} | ${sa.surgeNmae.toFixed(4).padEnd(13)} | ${sa.noSurgeNmae.toFixed(4).padEnd(13)} | ${sa.surgeRatio.toFixed(2)}x`
    );
  }

  console.log('\n========================================================================');
  console.log(' PAIRED BOOTSTRAP 95% CONFIDENCE INTERVALS vs SES (alpha=0.3)');
  console.log('========================================================================');
  console.log('Variant            | Pattern   | Mean Diff   | 95% Bootstrap CI');
  console.log('-------------------+-----------+-------------+-----------------------------');
  for (const pat of ['seasonal', 'spiky', 'steady']) {
    for (const v of EXPERIMENT_VARIANTS.filter((x) => x.id !== 'ses_03')) {
      const b = benchResults.summaryByPattern[pat][v.id].bootstrapCI;
      const diff = (b.meanDiff >= 0 ? `+${b.meanDiff.toFixed(4)}` : b.meanDiff.toFixed(4)).padEnd(11);
      const ci = `[${b.ciLower >= 0 ? '+' : ''}${b.ciLower.toFixed(4)}, ${b.ciUpper >= 0 ? '+' : ''}${b.ciUpper.toFixed(4)}]`;
      console.log(`${v.name.padEnd(18)} | ${pat.padEnd(9)} | ${diff} | ${ci}`);
    }
  }

  const durationMs = performance.now() - startTime;
  console.log('\n========================================================================');
  console.log(` All experiments completed in ${(durationMs / 1000).toFixed(2)}s (${Math.round(durationMs)} ms).`);
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error in experiments script:', err);
  process.exit(1);
});
