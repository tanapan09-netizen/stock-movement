import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import subprocess
import threading
import os
import sys
import datetime

class DeployTool:
    def __init__(self, root):
        self.root = root
        self.root.title("StockMovement Deploy Tool v1.0")
        self.root.geometry("800x600")
        
        # Style
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Variables
        self.db_push_var = tk.BooleanVar(value=True)
        self.status_var = tk.StringVar(value="Ready")
        
        self.setup_ui()
        self.check_docker_status()

    def setup_ui(self):
        # Header
        header_frame = ttk.Frame(self.root, padding="10")
        header_frame.pack(fill=tk.X)
        
        ttk.Label(header_frame, text="StockMovement Deployment Manager", font=("Segoe UI", 16, "bold")).pack(side=tk.LEFT)
        self.status_label = ttk.Label(header_frame, textvariable=self.status_var, font=("Segoe UI", 10))
        self.status_label.pack(side=tk.RIGHT)
        
        # Controls
        control_frame = ttk.LabelFrame(self.root, text="Actions", padding="10")
        control_frame.pack(fill=tk.X, padx=10, pady=5)
        
        # Top Row Buttons
        btn_frame1 = ttk.Frame(control_frame)
        btn_frame1.pack(fill=tk.X, pady=2)
        
        ttk.Button(btn_frame1, text="🔍 Check for Updates", command=self.check_updates, width=20).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame1, text="🚀 Deploy to Docker", command=self.start_deploy, width=20).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame1, text="🔄 Refresh Docker Status", command=self.check_docker_status, width=20).pack(side=tk.LEFT, padx=5)
        
        # Bottom Row Buttons
        btn_frame2 = ttk.Frame(control_frame)
        btn_frame2.pack(fill=tk.X, pady=2)
        
        ttk.Button(btn_frame2, text="💾 Backup Database", command=self.backup_database, width=20).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame2, text="☁️ Upload to Git", command=self.upload_git, width=20).pack(side=tk.LEFT, padx=5)
        
        ttk.Checkbutton(btn_frame2, text="Run DB Push (Prisma)", variable=self.db_push_var).pack(side=tk.LEFT, padx=20)

        # Docker Status Area
        status_frame = ttk.LabelFrame(self.root, text="Docker Containers", padding="10")
        status_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.container_list = tk.Listbox(status_frame, height=5, font=("Consolas", 9))
        self.container_list.pack(fill=tk.X)

        # Logs
        log_frame = ttk.LabelFrame(self.root, text="Deployment Logs", padding="10")
        log_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        self.log_area = scrolledtext.ScrolledText(log_frame, font=("Consolas", 9), state='disabled')
        self.log_area.pack(fill=tk.BOTH, expand=True)
        
        # Tags for coloring
        self.log_area.tag_config('info', foreground='black')
        self.log_area.tag_config('error', foreground='red')
        self.log_area.tag_config('success', foreground='green')
        self.log_area.tag_config('cmd', foreground='blue')

    def log(self, message, tag='info'):
        self.log_area.config(state='normal')
        self.log_area.insert(tk.END, message + "\n", tag)
        self.log_area.see(tk.END)
        self.log_area.config(state='disabled')

    def run_command(self, command, cwd=None):
        """Run command and yield output lines"""
        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
                cwd=cwd if cwd else os.getcwd(),
                text=True,
                bufsize=1,
                encoding='utf-8',
                errors='replace'
            )
            
            for line in process.stdout:
                yield line.strip()
                
            process.wait()
            return process.returncode
        except Exception as e:
            yield f"Error running command: {str(e)}"
            return 1

    def check_docker_status(self):
        def _target():
            self.root.after(0, lambda: self.container_list.delete(0, tk.END))
            cmd = "docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\""
            self.root.after(0, lambda: self.log(f"> {cmd}", 'cmd'))
            
            try:
                output = subprocess.check_output(cmd, shell=True, text=True).strip().split('\n')
                for line in output:
                     self.root.after(0, lambda l=line: self.container_list.insert(tk.END, l))
            except Exception as e:
                 self.root.after(0, lambda: self.log(f"Failed to check docker status: {e}", 'error'))

        threading.Thread(target=_target, daemon=True).start()

    def check_updates(self):
        def _target():
            self.status_var.set("Checking for updates...")
            self.log("-" * 50)
            self.log("Checking for updates...", 'info')
            
            # Fetch
            cmd_fetch = "git fetch"
            self.log(f"> {cmd_fetch}", 'cmd')
            if self.run_command_process(cmd_fetch) != 0:
                self.log("Failed to fetch updates", 'error')
                self.status_var.set("Update Check Failed")
                return

            # Compare
            cmd_log = "git log HEAD..origin/main --oneline"
            self.log(f"> {cmd_log}", 'cmd')
            try:
                output = subprocess.check_output(cmd_log, shell=True, text=True).strip()
                if output:
                    self.log(f"New updates available:\n{output}", 'success')
                    self.status_var.set("Updates Available")
                    self.root.after(0, lambda: messagebox.showinfo("Updates Available", f"Found new commits:\n{output}"))
                else:
                    self.log("System is up to date.", 'success')
                    self.status_var.set("Up to Date")
            except Exception as e:
                self.log(f"Error checking git log: {e}", 'error')
                self.status_var.set("Error")

        threading.Thread(target=_target, daemon=True).start()

    def run_command_process(self, command):
        """Helper to run command and pipe output to log_area"""
        return_code = 0
        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
                text=True,
                bufsize=1, # Line buffered
                encoding='utf-8',
                errors='replace'
            )
            
            for line in process.stdout:
                line = line.strip()
                if line:
                    self.root.after(0, lambda l=line: self.log(l))
            
            process.wait()
            return_code = process.returncode
        except Exception as e:
            self.root.after(0, lambda: self.log(f"Execution failed: {str(e)}", 'error'))
            return_code = 1
            
        return return_code

    def backup_database(self):
        if not messagebox.askyesno("Confirm Backup", "This will create a new database backup. Continue?"):
            return
            
        def _target():
            self.status_var.set("Backing up data...")
            self.log("=" * 50)
            self.log("Starting Database Backup...", 'info')
            
            if not os.path.exists('backups'):
                os.makedirs('backups')
                
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            backup_file = f"backups/backup_{timestamp}.sql"
            
            cmd = f'docker-compose -f docker-compose.prod.yml exec -T db mysqldump --skip-ssl -u root -pstockpassword stock_db > "{backup_file}"'
            self.log(f"> {cmd}", 'cmd')
            
            if self.run_command_process(cmd) == 0:
                self.log(f"Backup created successfully: {backup_file}", 'success')
                self.status_var.set("Backup Complete")
                self.root.after(0, lambda: messagebox.showinfo("Success", f"Database backed up to:\n{backup_file}"))
            else:
                self.log("Backup failed. Check logs.", 'error')
                self.status_var.set("Backup Failed")
                
        threading.Thread(target=_target, daemon=True).start()

    def upload_git(self):
        if not messagebox.askyesno("Confirm Upload", "This will commit all current changes and push to Git. Continue?"):
            return
            
        def _target():
            self.status_var.set("Uploading to Git...")
            self.log("=" * 50)
            self.log("Starting Git Upload Process...", 'info')
            
            self.log("\n[Step 1] Adding files...", 'info')
            if self.run_command_process("git add .") != 0:
                self.log("Git add failed.", 'error')
                self.status_var.set("Upload Failed")
                return
                
            self.log("\n[Step 2] Committing changes...", 'info')
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            commit_msg = f"Auto-commit from StockDeploy Tool: {timestamp}"
            cmd_commit = f'git commit -m "{commit_msg}"'
            
            return_code = self.run_command_process(cmd_commit)
            if return_code != 0:
                self.log("Nothing to commit or commit failed. Proceeding to push anyway just in case.", 'info')
                
            self.log("\n[Step 3] Pushing to remote...", 'info')
            if self.run_command_process("git push origin main") != 0:
                self.log("Git push failed. Please check network or git status.", 'error')
                self.status_var.set("Upload Failed")
                return
                
            self.log("\nUpload Complete!", 'success')
            self.status_var.set("Upload Complete")
            self.root.after(0, lambda: messagebox.showinfo("Success", "Successfully uploaded to Git!"))
            
        threading.Thread(target=_target, daemon=True).start()

    def start_deploy(self):
        if not messagebox.askyesno("Confirm Deploy", "This will rebuild and restart the Docker containers. Continue?"):
            return
            
        threading.Thread(target=self.deploy_process, daemon=True).start()

    def deploy_process(self):
        self.status_var.set("Deploying...")
        self.log("=" * 50)
        self.log("Starting Deployment Process...", 'info')

        # 1. Pull
        self.log("\n[Step 1] Pulling latest code...", 'info')
        if self.run_command_process("git pull") != 0:
            self.log("Git pull failed. Aborting.", 'error')
            self.status_var.set("Deploy Failed")
            return

        # 2. Build
        self.log("\n[Step 2] Building Docker Image...", 'info')
        # Use --no-cache to ensure fresh build if needed, or normal build
        # Plan says: docker-compose -f docker-compose.prod.yml build --no-cache app
        build_cmd = "docker-compose -f docker-compose.prod.yml build app" 
        if self.run_command_process(build_cmd) != 0:
            self.log("Build failed. Aborting.", 'error')
            self.status_var.set("Deploy Failed")
            return

        # 3. Up
        self.log("\n[Step 3] Restarting Containers...", 'info')
        up_cmd = "docker-compose -f docker-compose.prod.yml up -d"
        if self.run_command_process(up_cmd) != 0:
             self.log("Docker Up failed. Aborting.", 'error')
             self.status_var.set("Deploy Failed")
             return

        # 4. DB Push (Optional)
        if self.db_push_var.get():
             self.log("\n[Step 4] Pushing Database Schema...", 'info')
             # Need to set DATABASE_URL correctly. 
             # Assuming running on host, we might need localhost port if exposed
             # Or run inside container. 'docker-compose exec app npx prisma db push' might be better
             
             # Plan says: Prisma DB push
             # Let's try running it inside the container to avoid environment issues
             db_cmd = "docker-compose -f docker-compose.prod.yml exec -T app npx prisma db push"
             
             if self.run_command_process(db_cmd) != 0:
                 self.log("DB Push failed (It might be okay if no schema changes).", 'error')
             else:
                 self.log("DB Schema Pushed Successfully.", 'success')

        self.log("\nDeployment Complete!", 'success')
        self.status_var.set("Deployed Successfully")
        self.check_docker_status()
        self.root.after(0, lambda: messagebox.showinfo("Success", "Deployment Completed Successfully!"))

if __name__ == "__main__":
    # Change to project root dynamically based on whether it's a script or frozen exe
    if getattr(sys, 'frozen', False):
        app_dir = os.path.dirname(sys.executable)
    else:
        app_dir = os.path.dirname(os.path.abspath(__file__))
        
    if os.path.basename(app_dir) == 'dist':
        os.chdir(os.path.join(app_dir, '..', '..'))
    elif os.path.basename(app_dir) == 'tools':
        os.chdir(os.path.join(app_dir, '..'))
        
    root = tk.Tk()
    app = DeployTool(root)
    root.mainloop()
