$code = @"
using System;
using System.Diagnostics;
using System.IO;

namespace Launcher {
    class Program {
        static void Main(string[] args) {
            try {
                // Name of the batch file to run
                string batFile = "start-production.bat";
                string currentDir = AppDomain.CurrentDomain.BaseDirectory;
                string batPath = Path.Combine(currentDir, batFile);

                if (!File.Exists(batPath)) {
                    Console.WriteLine("Error: " + batFile + " not found in " + currentDir);
                    Console.WriteLine("Press any key to exit...");
                    Console.ReadKey();
                    return;
                }

                // Check environment
                string nextDir = Path.Combine(currentDir, ".next");
                string nodeModules = Path.Combine(currentDir, "node_modules");
                
                // Optional: Simple health check before launch
                if (!Directory.Exists(nodeModules)) {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine("[Check] node_modules not found. First run might take longer.");
                    Console.ResetColor();
                }

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c \"" + batFile + "\"";
                psi.WorkingDirectory = currentDir;
                psi.UseShellExecute = false; // Set to false to run within this window if possible, or true to spawn new
                // We want to replace this process or spawn a child that takes over.
                // start-production.bat has user interaction (Y/N prompt).
                
                // Let's spawn it as a child process in the same window/console?
                // Actually, if this is an EXE, users double click it. A console window opens for this EXE.
                // We can just run the batch file inside this existing console window.
                psi.UseShellExecute = false;
                
                Process p = Process.Start(psi);
                p.WaitForExit();
            } catch (Exception ex) {
                Console.WriteLine("An error occurred: " + ex.Message);
                Console.ReadKey();
            }
        }
    }
}
"@

$parameters = @{
    TypeDefinition = $code
    Language = 'CSharp'
    OutputAssembly = "Start Stock Movement.exe"
    OutputType = 'ConsoleApplication'
    ReferencedAssemblies = 'System.dll'
}

Add-Type @parameters
Write-Host "Executable created successfully: Start Stock Movement.exe"
