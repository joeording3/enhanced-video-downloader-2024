#!/usr/bin/env python3
"""
Optimized Mutmut Testing Script

This script provides optimized mutation testing capabilities for the Enhanced Video Downloader project.
It includes selective testing, performance optimization, and comprehensive reporting.

Features:
- Selective mutation testing for critical modules
- Parallel execution optimization
- Mutation score tracking and analysis
- Performance monitoring and reporting
- Integration with CI/CD pipeline
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional


class MutmutOptimizer:
    """Optimized mutmut testing manager."""

    def __init__(self, project_root: Path):
        """Initialize the mutmut optimizer.

        Args:
            project_root: Path to the project root directory
        """
        self.project_root = project_root
        self.mutants_dir = project_root / "mutants"
        self.reports_dir = project_root / "reports" / "mutation"
        self.config_file = project_root / "setup.cfg"

        # Critical modules for priority testing
        self.critical_modules = [
            "server/api/",
            "server/cli/",
            "server/downloads/",
            "server/config.py",
            "server/history.py",
            "server/schemas.py",
        ]

        # Non-critical modules (excluded from initial testing)
        self.non_critical_modules = [
            "server/utils/",
            "server/integration/",
            "server/data/",
            "server/config/",
        ]

    def analyze_current_state(self) -> Dict:
        """Analyze current mutmut state and provide recommendations.

        Returns:
            Dictionary with analysis results and recommendations
        """

        analysis: Dict[str, Any] = {
            "total_mutations": 0,
            "checked_mutations": 0,
            "survived_mutations": 0,
            "killed_mutations": 0,
            "timeout_mutations": 0,
            "recommendations": [],
        }

        # Check if mutmut results exist
        if self.mutants_dir.exists():
            try:
                result = subprocess.run(
                    ["mutmut", "results"], check=False, capture_output=True, text=True, cwd=self.project_root
                )

                if result.returncode == 0:
                    lines = result.stdout.strip().split("\n")
                    analysis["total_mutations"] = len(lines)

                    for line in lines:
                        if "not checked" in line:
                            analysis["checked_mutations"] += 1
                        elif "survived" in line:
                            analysis["survived_mutations"] += 1
                        elif "killed" in line:
                            analysis["killed_mutations"] += 1
                        elif "timeout" in line:
                            analysis["timeout_mutations"] += 1

                    # Calculate mutation score
                    total_checked = analysis["killed_mutations"] + analysis["survived_mutations"]
                    if total_checked > 0:
                        mutation_score = (analysis["killed_mutations"] / total_checked) * 100
                        analysis["mutation_score"] = round(mutation_score, 2)
                    else:
                        analysis["mutation_score"] = 0

                    # Generate recommendations
                    if analysis["survived_mutations"] > 0:
                        analysis["recommendations"].append(
                            f"Found {analysis['survived_mutations']} survived mutations. "
                            "Consider improving test coverage for affected modules."
                        )

                    if analysis["timeout_mutations"] > 0:
                        analysis["recommendations"].append(
                            f"Found {analysis['timeout_mutations']} timeout mutations. "
                            "Consider increasing timeout_factor in setup.cfg."
                        )

                    if analysis["checked_mutations"] > 0:
                        analysis["recommendations"].append(
                            f"Found {analysis['checked_mutations']} unchecked mutations. "
                            "Run full mutation testing to complete analysis."
                        )
                else:
                    analysis["recommendations"].append("No mutmut results found. Run initial mutation testing.")

            except Exception as e:
                analysis["recommendations"].append(f"Error analyzing mutmut state: {e}")

        return analysis

    def run_selective_mutation_testing(self, modules: Optional[List[str]] = None) -> bool:
        """Run selective mutation testing on specified modules.

        Args:
            modules: List of modules to test. If None, tests critical modules.

        Returns:
            True if testing completed successfully, False otherwise
        """
        if modules is None:
            modules = self.critical_modules

        # Note: mutmut uses setup.cfg for configuration
        # For selective testing, we'll use the existing optimized setup.cfg
        # and rely on the exclude patterns to focus on critical modules

        # Run mutmut with optimized configuration
        cmd = ["mutmut", "run"]

        start_time = time.time()

        result = subprocess.run(cmd, check=False, cwd=self.project_root, capture_output=True, text=True)

        end_time = time.time()
        end_time - start_time

        if result.stdout:
            pass

        if result.stderr:
            pass

        return result.returncode == 0

    def _create_selective_config(self, modules: List[str]) -> Path:
        """Create temporary configuration for selective testing.

        Args:
            modules: List of modules to include in testing

        Returns:
            Path to temporary configuration file
        """
        config_content = f"""[mutmut]
paths_to_mutate={",".join(modules)}
backup=False
runner=python -m pytest
tests_dir=tests/
max_workers=4
timeout_factor=3.0
enable_speed_report=True
dict_synonyms=Struct, NamedStruct
threshold=80
exclude=server/__pycache__/*,server/*.pyc,server/data/*,server/config/*.json,mutants/*
mutation_operators=operator,comparison,boolean,number,string
test_time_multiplier=2.0
test_time_base=60
coverage_analysis=True
"""

        temp_config = self.project_root / "temp_mutmut.ini"
        temp_config.write_text(config_content)
        return temp_config

    def generate_mutation_report(self) -> Dict:
        """Generate comprehensive mutation testing report.

        Returns:
            Dictionary with detailed mutation testing report
        """

        report = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "project": "Enhanced Video Downloader",
            "analysis": self.analyze_current_state(),
            "recommendations": [],
            "performance_metrics": {},
            "module_coverage": {},
        }

        # Get detailed results
        try:
            result = subprocess.run(
                ["mutmut", "results"], check=False, capture_output=True, text=True, cwd=self.project_root
            )

            if result.returncode == 0:
                # Parse results by module
                module_results = {}
                for line in result.stdout.strip().split("\n"):
                    if "." in line:
                        module = line.split(".")[0]
                        if module not in module_results:
                            module_results[module] = {
                                "total": 0,
                                "killed": 0,
                                "survived": 0,
                                "timeout": 0,
                                "not_checked": 0,
                            }

                        module_results[module]["total"] += 1

                        if "killed" in line:
                            module_results[module]["killed"] += 1
                        elif "survived" in line:
                            module_results[module]["survived"] += 1
                        elif "timeout" in line:
                            module_results[module]["timeout"] += 1
                        elif "not checked" in line:
                            module_results[module]["not_checked"] += 1

                report["module_coverage"] = module_results

                # Calculate module-specific scores
                for results in module_results.values():
                    total_checked = results["killed"] + results["survived"]
                    if total_checked > 0:
                        score = (results["killed"] / total_checked) * 100
                        results["mutation_score"] = round(score, 2)
                    else:
                        results["mutation_score"] = 0

                # Generate recommendations
                low_score_modules = [
                    module for module, results in module_results.items() if results.get("mutation_score", 0) < 80
                ]

                if low_score_modules:
                    report["recommendations"].append(
                        f"Modules with low mutation scores (<80%): {', '.join(low_score_modules)}"
                    )

                high_survived_modules = [
                    module for module, results in module_results.items() if results.get("survived", 0) > 5
                ]

                if high_survived_modules:
                    report["recommendations"].append(
                        f"Modules with many survived mutations: {', '.join(high_survived_modules)}"
                    )

        except Exception as e:
            report["error"] = str(e)

        return report

    def save_report(self, report: Dict, filename: str = "mutation_report.json") -> Path:
        """Save mutation testing report to file.

        Args:
            report: Report dictionary to save
            filename: Name of the report file

        Returns:
            Path to the saved report file
        """
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        report_path = self.reports_dir / filename

        with report_path.open("w") as f:
            json.dump(report, f, indent=2)

        return report_path

    def optimize_configuration(self) -> bool:
        """Optimize mutmut configuration for better performance.

        Returns:
            True if optimization was successful, False otherwise
        """

        try:
            # Backup current configuration
            backup_path = self.config_file.with_suffix(".cfg.backup")
            if self.config_file.exists():
                backup_path.write_text(self.config_file.read_text())

            # The configuration is already optimized in setup.cfg
            return True  # noqa: TRY300

        except Exception:
            return False

    def run_performance_test(self) -> Dict:
        """Run performance test to measure mutation testing efficiency.

        Returns:
            Dictionary with performance metrics
        """

        # Test with a small subset of critical modules
        test_modules = ["server/config.py", "server/schemas.py"]

        start_time = time.time()
        success = self.run_selective_mutation_testing(test_modules)
        end_time = time.time()

        duration = end_time - start_time

        return {
            "test_modules": test_modules,
            "duration_seconds": round(duration, 2),
            "success": success,
            "modules_per_minute": round(len(test_modules) / (duration / 60), 2),
        }


def main():
    """Main entry point for the mutmut optimizer."""
    parser = argparse.ArgumentParser(description="Optimized Mutmut Testing for Enhanced Video Downloader")

    parser.add_argument("--analyze", action="store_true", help="Analyze current mutmut state")

    parser.add_argument("--run", action="store_true", help="Run selective mutation testing")

    parser.add_argument("--modules", nargs="+", help="Specific modules to test")

    parser.add_argument("--report", action="store_true", help="Generate comprehensive mutation report")

    parser.add_argument("--optimize", action="store_true", help="Optimize mutmut configuration")

    parser.add_argument("--performance", action="store_true", help="Run performance test")

    parser.add_argument("--all", action="store_true", help="Run all optimizations and tests")

    args = parser.parse_args()

    # Initialize optimizer
    project_root = Path(__file__).parent.parent
    optimizer = MutmutOptimizer(project_root)

    if args.analyze or args.all:
        analysis = optimizer.analyze_current_state()
        if "mutation_score" in analysis:
            pass

        if analysis["recommendations"]:
            for _rec in analysis["recommendations"]:
                pass

    if args.optimize or args.all:
        optimizer.optimize_configuration()

    if args.performance or args.all:
        optimizer.run_performance_test()

    if args.run or args.all:
        success = optimizer.run_selective_mutation_testing(args.modules)
        if not success:
            sys.exit(1)

    if args.report or args.all:
        report = optimizer.generate_mutation_report()
        optimizer.save_report(report)

    if not any([args.analyze, args.run, args.report, args.optimize, args.performance, args.all]):
        parser.print_help()


if __name__ == "__main__":
    main()
