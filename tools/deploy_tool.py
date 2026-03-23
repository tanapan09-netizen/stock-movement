import customtkinter as ctk
import tkinter as tk
from tkinter import scrolledtext, messagebox
import subprocess
import threading
import os
import sys
import datetime

# --- Setup CustomTkinter ---
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class DeployTool(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("StockMovement Deployment Manager")
        self.geometry("1000x700")
        
        # Configure layout
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        # Variables
        self.db_push_var = ctk.StringVar(value="on")
        self.status_var = ctk.StringVar(value="Ready")
        
        self.setup_ui()
        self.check_docker_status()

    def setup_ui(self):
        # --- Sidebar ---
        self.sidebar_frame = ctk.CTkFrame(self, width=250, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(7, weight=1)
        
        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="Stock Pro", font=ctk.CTkFont(size=24, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(30, 5))
        self.subtitle_label = ctk.CTkLabel(self.sidebar_frame, text="Docker Deploy Tool", font=ctk.CTkFont(size=13), text_color="gray")
        self.subtitle_label.grid(row=1, column=0, padx=20, pady=(0, 30))
        
        self.btn_update = ctk.CTkButton(self.sidebar_frame, text="🔍 Check for Updates", command=self.check_updates, 
                                        fg_color="#3B82F6", hover_color="#2563EB", height=40, font=ctk.CTkFont(size=14))
        self.btn_update.grid(row=2, column=0, padx=20, pady=10)
        
        self.btn_git = ctk.CTkButton(self.sidebar_frame, text="☁️ Upload to Git", command=self.upload_git, 
                                     fg_color="#6366F1", hover_color="#4F46E5", height=40, font=ctk.CTkFont(size=14))
        self.btn_git.grid(row=3, column=0, padx=20, pady=10)
        
        self.btn_deploy = ctk.CTkButton(self.sidebar_frame, text="🚀 Deploy to Docker", command=self.start_deploy, 
                                        fg_color="#10B981", hover_color="#059669", height=40, font=ctk.CTkFont(size=14, weight="bold"))
        self.btn_deploy.grid(row=4, column=0, padx=20, pady=10)
        
        self.btn_backup = ctk.CTkButton(self.sidebar_frame, text="💾 Backup Database", command=self.backup_database, 
                                        fg_color="#F59E0B", hover_color="#D97706", height=40, font=ctk.CTkFont(size=14))
        self.btn_backup.grid(row=5, column=0, padx=20, pady=10)

        self.btn_registry = ctk.CTkButton(self.sidebar_frame, text="🐳 Push to Registry", command=self.upload_registry, 
                                        fg_color="#0EA5E9", hover_color="#0284C7", height=40, font=ctk.CTkFont(size=14))
        self.btn_registry.grid(row=6, column=0, padx=20, pady=10)
        
        self.btn_ssh = ctk.CTkButton(self.sidebar_frame, text="🔌 App Container Console", command=self.open_ssh, 
                                        fg_color="#8B5CF6", hover_color="#7C3AED", height=40, font=ctk.CTkFont(size=14))
        self.btn_ssh.grid(row=7, column=0, padx=20, pady=10)
        
        # --- Remote SSH ---
        self.ssh_label = ctk.CTkLabel(self.sidebar_frame, text="Remote SSH:", font=ctk.CTkFont(size=12, weight="bold"))
        self.ssh_label.grid(row=8, column=0, padx=20, pady=(10, 0), sticky="w")

        self.ssh_input = ctk.CTkEntry(self.sidebar_frame, placeholder_text="user@host -p port")
        self.ssh_input.grid(row=9, column=0, padx=20, pady=(5, 0), sticky="ew")
        self.ssh_input.insert(0, "nong@sg.sugoidev.com -p 8022")

        self.btn_ssh_remote = ctk.CTkButton(self.sidebar_frame, text="🌐 Connect Server", command=self.connect_ssh_remote, 
                                        fg_color="#F43F5E", hover_color="#E11D48", height=30, font=ctk.CTkFont(size=12))
        self.btn_ssh_remote.grid(row=10, column=0, padx=20, pady=(5, 10), sticky="ew")

        # --- Server Controls ---
        self.control_label = ctk.CTkLabel(self.sidebar_frame, text="Server Controls:", font=ctk.CTkFont(size=12, weight="bold"))
        self.control_label.grid(row=11, column=0, padx=20, pady=(10, 0), sticky="w")
        
        self.control_frame = ctk.CTkFrame(self.sidebar_frame, fg_color="transparent")
        self.control_frame.grid(row=12, column=0, padx=20, pady=5, sticky="ew")
        
        self.btn_start = ctk.CTkButton(self.control_frame, text="▶️ Start", command=self.start_server, fg_color="#10B981", hover_color="#059669", width=60)
        self.btn_start.pack(side="left", padx=(0, 5), expand=True, fill="x")
        
        self.btn_stop = ctk.CTkButton(self.control_frame, text="⏹️ Stop", command=self.stop_server, fg_color="#EF4444", hover_color="#DC2626", width=60)
        self.btn_stop.pack(side="left", padx=5, expand=True, fill="x")
        
        self.btn_restart = ctk.CTkButton(self.control_frame, text="🔄 Restart", command=self.restart_server, fg_color="#F59E0B", hover_color="#D97706", width=60)
        self.btn_restart.pack(side="left", padx=(5, 0), expand=True, fill="x")

        self.db_push_check = ctk.CTkCheckBox(self.sidebar_frame, text="Run DB Push (Prisma)", variable=self.db_push_var, onvalue="on", offvalue="off")
        self.db_push_check.grid(row=13, column=0, padx=20, pady=20)
        
        self.appearance_mode_label = ctk.CTkLabel(self.sidebar_frame, text="Theme:", anchor="w")
        self.appearance_mode_label.grid(row=14, column=0, padx=20, pady=(10, 0))
        self.appearance_mode_optionmenu = ctk.CTkOptionMenu(self.sidebar_frame, values=["Dark", "Light"],
                                                               command=self.change_appearance_mode_event)
        self.appearance_mode_optionmenu.grid(row=15, column=0, padx=20, pady=(10, 20))

        # --- Main Area ---
        self.main_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, padx=20, pady=20, sticky="nsew")
        self.main_frame.grid_rowconfigure(2, weight=1)
        self.main_frame.grid_columnconfigure(0, weight=1)
        
        # Status Bar
        self.status_frame = ctk.CTkFrame(self.main_frame, height=50, corner_radius=10)
        self.status_frame.grid(row=0, column=0, sticky="ew", pady=(0, 20))
        self.status_frame.grid_columnconfigure(0, weight=1)
        
        self.status_label = ctk.CTkLabel(self.status_frame, textvariable=self.status_var, font=ctk.CTkFont(size=14, weight="bold"))
        self.status_label.grid(row=0, column=0, padx=20, pady=15, sticky="w")
        
        self.btn_refresh = ctk.CTkButton(self.status_frame, text="🔄 Refresh Status", width=120, command=self.check_docker_status, fg_color="#4B5563", hover_color="#374151")
        self.btn_refresh.grid(row=0, column=1, padx=20, pady=10, sticky="e")
        
        # Docker Containers View
        self.containers_frame = ctk.CTkFrame(self.main_frame, corner_radius=10)
        self.containers_frame.grid(row=1, column=0, sticky="ew", pady=(0, 20))
        
        self.containers_label = ctk.CTkLabel(self.containers_frame, text="📦 Docker Containers", font=ctk.CTkFont(weight="bold", size=14))
        self.containers_label.pack(anchor="w", padx=15, pady=(10, 0))
        
        self.container_list = tk.Listbox(self.containers_frame, height=4, font=("Consolas", 10), bg="#2B2B2B", fg="#FFFFFF", selectbackground="#1F538D", borderwidth=0, highlightthickness=0)
        self.container_list.pack(fill="x", padx=15, pady=10)
        
        # Logs View
        self.logs_frame = ctk.CTkFrame(self.main_frame, corner_radius=10)
        self.logs_frame.grid(row=2, column=0, sticky="nsew")
        
        self.logs_label = ctk.CTkLabel(self.logs_frame, text="📝 Deployment Logs", font=ctk.CTkFont(weight="bold", size=14))
        self.logs_label.pack(anchor="w", padx=15, pady=(10, 0))
        
        self.log_area = scrolledtext.ScrolledText(self.logs_frame, font=("Consolas", 10), state='disabled', bg="#1E1E1E", fg="#CCCCCC", borderwidth=0, highlightthickness=0)
        self.log_area.pack(fill="both", expand=True, padx=15, pady=10)
        
        # Tags for log coloring
        self.log_area.tag_config('info', foreground='#CCCCCC')
        self.log_area.tag_config('error', foreground='#EF4444')
        self.log_area.tag_config('success', foreground='#10B981')
        self.log_area.tag_config('cmd', foreground='#3B82F6')

    def change_appearance_mode_event(self, new_appearance_mode: str):
        ctk.set_appearance_mode(new_appearance_mode)
        if new_appearance_mode.lower() == "light":
            self.container_list.config(bg="#FFFFFF", fg="#000000")
            self.log_area.config(bg="#F3F4F6", fg="#000000")
            self.log_area.tag_config('info', foreground='#000000')
        else:
            self.container_list.config(bg="#2B2B2B", fg="#FFFFFF")
            self.log_area.config(bg="#1E1E1E", fg="#CCCCCC")
            self.log_area.tag_config('info', foreground='#CCCCCC')

    def log(self, message, tag='info'):
        self.log_area.config(state='normal')
        self.log_area.insert(tk.END, message + "\n", tag)
        self.log_area.see(tk.END)
        self.log_area.config(state='disabled')

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
                bufsize=1,
                encoding='utf-8',
                errors='replace'
            )
            for line in process.stdout:
                line = line.strip()
                if line:
                    self.after(0, lambda l=line: self.log(l))
            process.wait()
            return_code = process.returncode
        except Exception as e:
            self.after(0, lambda: self.log(f"Execution failed: {str(e)}", 'error'))
            return_code = 1
        return return_code

    def is_git_repo(self):
        """Returns True when current working directory is a git work tree."""
        if os.path.isdir('.git'):
            return True
        try:
            result = subprocess.run(
                "git rev-parse --is-inside-work-tree",
                shell=True,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            return result.returncode == 0 and result.stdout.strip().lower() == 'true'
        except Exception:
            return False

    def git_prereq_message(self):
        return (
            "This folder is not a Git repository (no .git).\n\n"
            "Fix options:\n"
            "1) Clone the project with Git (recommended)\n"
            "2) If you copied the folder, copy the hidden .git folder too\n"
            "3) Or run: git init, git remote add origin <url>, git fetch, git checkout main\n\n"
            "หมายเหตุ: ถ้าโหลดมาเป็น ZIP จะไม่มีโฟลเดอร์ .git ทำให้ pull/push ไม่ได้"
        )

    def ask_yesno_threadsafe(self, title, message):
        """Ask a yes/no question from background threads safely."""
        event = threading.Event()
        result = {'value': False}

        def _ask():
            try:
                result['value'] = messagebox.askyesno(title, message)
            finally:
                event.set()

        self.after(0, _ask)
        event.wait()
        return result['value']

    def check_docker_status(self):
        def _target():
            self.after(0, lambda: self.container_list.delete(0, tk.END))
            cmd = "docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\""
            self.after(0, lambda: self.log(f"> {cmd}", 'cmd'))
            
            try:
                output = subprocess.check_output(cmd, shell=True, text=True).strip().split('\n')
                for line in output:
                     self.after(0, lambda l=line: self.container_list.insert(tk.END, l))
            except Exception as e:
                 self.after(0, lambda: self.log(f"Failed to check docker status: {e}", 'error'))

        threading.Thread(target=_target, daemon=True).start()

    def check_updates(self):
        def _target():
            self.status_var.set("Checking for updates...")
            self.log("-" * 50)
            self.log("Checking for updates...", 'info')

            if not self.is_git_repo():
                self.log("Not a Git repository. Skipping update check.", 'error')
                self.status_var.set("Not a Git Repo")
                self.after(0, lambda: messagebox.showerror("Git Not Found", self.git_prereq_message()))
                return
            
            cmd_fetch = "git fetch"
            self.log(f"> {cmd_fetch}", 'cmd')
            if self.run_command_process(cmd_fetch) != 0:
                self.log("Failed to fetch updates", 'error')
                self.status_var.set("Update Check Failed")
                return

            cmd_log = "git log HEAD..origin/main --oneline"
            self.log(f"> {cmd_log}", 'cmd')
            try:
                output = subprocess.check_output(cmd_log, shell=True, text=True).strip()
                if output:
                    self.log(f"New updates available:\n{output}", 'success')
                    self.status_var.set("Updates Available")
                    self.after(0, lambda: messagebox.showinfo("Updates Available", f"Found new commits:\n{output}"))
                else:
                    self.log("System is up to date.", 'success')
                    self.status_var.set("Up to Date")
            except Exception as e:
                self.log(f"Error checking git log: {e}", 'error')
                self.status_var.set("Error")

        threading.Thread(target=_target, daemon=True).start()

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
            
            cmd = f'docker-compose -f docker-compose.prod.yml exec -T db mysqldump -u root -pstockpassword stock_db > "{backup_file}"'
            self.log(f"> {cmd}", 'cmd')
            
            if self.run_command_process(cmd) == 0:
                self.log(f"Backup created successfully: {backup_file}", 'success')
                self.status_var.set("Backup Complete")
                self.after(0, lambda: messagebox.showinfo("Success", f"Database backed up to:\n{backup_file}"))
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

            if not self.is_git_repo():
                self.log("Not a Git repository. Upload aborted.", 'error')
                self.status_var.set("Upload Failed")
                self.after(0, lambda: messagebox.showerror("Git Not Found", self.git_prereq_message()))
                return
            
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
            self.after(0, lambda: messagebox.showinfo("Success", "Successfully uploaded to Git!"))
            
        threading.Thread(target=_target, daemon=True).start()

    def upload_registry(self):
        if not messagebox.askyesno("Confirm Registry Push", "This will build and push the Docker image to registry.sugoidev.com. Continue?"):
            return
            
        def _target():
            self.status_var.set("Pushing to Registry...")
            self.log("=" * 50)
            self.log("Starting Registry Push Process...", 'info')
                
            self.log("\n[Step 1] Building Docker Image...", 'info')
            build_cmd = "docker build . --tag stock-movement:latest"
            self.log(f"> {build_cmd}", 'cmd')
            if self.run_command_process(build_cmd) != 0:
                self.log("Docker build failed.", 'error')
                self.status_var.set("Push Failed")
                return
                
            self.log("\n[Step 2] Tagging Image...", 'info')
            tag_cmd = "docker tag stock-movement:latest registry.sugoidev.com/nong/stock-movement:latest"
            self.log(f"> {tag_cmd}", 'cmd')
            if self.run_command_process(tag_cmd) != 0:
                self.log("Docker tag failed.", 'error')
                self.status_var.set("Push Failed")
                return
                
            self.log("\n[Step 3] Pushing to Remote Registry...", 'info')
            push_cmd = "docker push registry.sugoidev.com/nong/stock-movement:latest"
            self.log(f"> {push_cmd}", 'cmd')
            if self.run_command_process(push_cmd) != 0:
                self.log("Docker push failed. Did you run 'docker login registry.sugoidev.com' in terminal?", 'error')
                self.status_var.set("Push Failed")
                return
                
            self.log("\nRegistry Push Complete!", 'success')
            self.status_var.set("Push Complete")
            self.after(0, lambda: messagebox.showinfo("Success", "Successfully pushed image to Sugoidev Registry!"))
            
        threading.Thread(target=_target, daemon=True).start()

    def open_ssh(self):
        """Opens a new terminal window connected to the app container"""
        self.log("=" * 50)
        self.log("Opening SSH connection to 'app' container...", 'info')
        
        # Determine the terminal command based on the OS
        if os.name == 'nt':
            # Windows: use start cmd configured to run docker exec
            cmd = 'start cmd /k "docker-compose -f docker-compose.prod.yml exec app sh"'
        else:
            # macOS/Linux: we try a few common terminal emulators
            terminals = [
                "x-terminal-emulator -e", "gnome-terminal --", "konsole -e", "xfce4-terminal -e", "mac-terminal"
            ]
            
            if sys.platform == "darwin":
                cmd = "osascript -e 'tell application \"Terminal\" to do script \"cd \\\"" + os.getcwd() + "\\\" && docker-compose -f docker-compose.prod.yml exec app sh\"'"
            else:
                cmd = f"x-terminal-emulator -e 'docker-compose -f docker-compose.prod.yml exec app sh'" # simplified default
                
        self.log(f"> {cmd}", 'cmd')
        try:
            subprocess.Popen(cmd, shell=True)
            self.log("SSH window opened.", 'success')
        except Exception as e:
            self.log(f"Failed to open SSH window: {e}", 'error')
            
    def connect_ssh_remote(self):
        """Opens a new terminal window connected to the remote server"""
        ssh_string = self.ssh_input.get().strip()
        if not ssh_string:
            messagebox.showwarning("Warning", "Please enter an SSH connection string.")
            return

        self.log("=" * 50)
        self.log(f"Opening SSH connection to '{ssh_string}'...", 'info')
        
        # Determine the terminal command based on the OS
        if os.name == 'nt':
            cmd = f'start cmd /k "ssh {ssh_string}"'
        else:
            if sys.platform == "darwin":
                cmd = f"osascript -e 'tell application \"Terminal\" to do script \"ssh {ssh_string}\"'"
            else:
                cmd = f"x-terminal-emulator -e 'ssh {ssh_string}'"
                
        self.log(f"> {cmd}", 'cmd')
        try:
            subprocess.Popen(cmd, shell=True)
            self.log("Remote SSH window opened.", 'success')
        except Exception as e:
            self.log(f"Failed to open Remote SSH window: {e}", 'error')

    def start_server(self):
        if not messagebox.askyesno("Confirm Start", "Start the server containers?"):
            return
        def _target():
            self.status_var.set("Starting Server...")
            self.log("=" * 50)
            self.log("Starting Server...", 'info')
            cmd = "docker-compose -f docker-compose.prod.yml up -d"
            self.log(f"> {cmd}", 'cmd')
            if self.run_command_process(cmd) == 0:
                self.log("Server started successfully!", 'success')
                self.status_var.set("Server Running")
                self.check_docker_status()
            else:
                self.log("Failed to start server.", 'error')
                self.status_var.set("Error")
        threading.Thread(target=_target, daemon=True).start()

    def stop_server(self):
        if not messagebox.askyesno("Confirm Stop", "Stop the server? This will bring down the containers."):
            return
        def _target():
            self.status_var.set("Stopping Server...")
            self.log("=" * 50)
            self.log("Stopping Server...", 'info')
            cmd = "docker-compose -f docker-compose.prod.yml down"
            self.log(f"> {cmd}", 'cmd')
            if self.run_command_process(cmd) == 0:
                self.log("Server stopped successfully!", 'success')
                self.status_var.set("Server Stopped")
                self.check_docker_status()
            else:
                self.log("Failed to stop server.", 'error')
                self.status_var.set("Error")
        threading.Thread(target=_target, daemon=True).start()

    def restart_server(self):
        if not messagebox.askyesno("Confirm Restart", "Restart the server containers?"):
            return
        def _target():
            self.status_var.set("Restarting Server...")
            self.log("=" * 50)
            self.log("Restarting Server...", 'info')
            cmd = "docker-compose -f docker-compose.prod.yml restart"
            self.log(f"> {cmd}", 'cmd')
            if self.run_command_process(cmd) == 0:
                self.log("Server restarted successfully!", 'success')
                self.status_var.set("Server Running")
                self.check_docker_status()
            else:
                self.log("Failed to restart server.", 'error')
                self.status_var.set("Error")
        threading.Thread(target=_target, daemon=True).start()

    def start_deploy(self):
        if not messagebox.askyesno("Confirm Deploy", "This will rebuild and restart the Docker containers. Continue?"):
            return
            
        threading.Thread(target=self.deploy_process, daemon=True).start()

    def deploy_process(self):
        self.status_var.set("Deploying...")
        self.log("=" * 50)
        self.log("Starting Deployment Process...", 'info')

        self.log("\n[Step 1] Pulling latest code...", 'info')
        if not self.is_git_repo():
            self.log("Not a Git repository detected. Cannot pull latest code.", 'error')
            proceed = self.ask_yesno_threadsafe(
                "Git Not Found",
                self.git_prereq_message() + "\n\nContinue deployment without pulling latest code?"
            )
            if not proceed:
                self.log("Deployment aborted (no git repo).", 'error')
                self.status_var.set("Deploy Failed")
                return
            self.log("Skipping git pull (deploying current working tree).", 'info')
        else:
            if self.run_command_process("git pull") != 0:
                self.log("Git pull failed. Aborting.", 'error')
                self.status_var.set("Deploy Failed")
                return

        self.log("\n[Step 2] Building Docker Image...", 'info')
        build_cmd = "docker-compose -f docker-compose.prod.yml build app" 
        if self.run_command_process(build_cmd) != 0:
            self.log("Build failed. Aborting.", 'error')
            self.status_var.set("Deploy Failed")
            return

        self.log("\n[Step 3] Restarting Containers...", 'info')
        up_cmd = "docker-compose -f docker-compose.prod.yml up -d"
        if self.run_command_process(up_cmd) != 0:
             self.log("Docker Up failed. Aborting.", 'error')
             self.status_var.set("Deploy Failed")
             return

        if self.db_push_var.get() == "on":
             self.log("\n[Step 4] Pushing Database Schema...", 'info')
             db_url = "mysql://root:stockpassword@db:3306/stock_db?ssl-mode=DISABLED"
             db_cmd = f"docker-compose -f docker-compose.prod.yml exec -T app sh -c \"export DATABASE_URL={db_url} && npx prisma@5.22.0 db push --skip-generate\""
             
             if self.run_command_process(db_cmd) != 0:
                 self.log("DB Push failed (It might be okay if no schema changes).", 'error')
             else:
                 self.log("DB Schema Pushed Successfully.", 'success')

        self.log("\nDeployment Complete!", 'success')
        self.status_var.set("Deployed Successfully")
        self.check_docker_status()
        self.after(0, lambda: messagebox.showinfo("Success", "Deployment Completed Successfully!"))

if __name__ == "__main__":
    if getattr(sys, 'frozen', False):
        app_dir = os.path.dirname(sys.executable)
    else:
        app_dir = os.path.dirname(os.path.abspath(__file__))
        
    if os.path.basename(app_dir) == 'dist':
        os.chdir(os.path.join(app_dir, '..', '..'))
    elif os.path.basename(app_dir) == 'tools':
        os.chdir(os.path.join(app_dir, '..'))
        
    app = DeployTool()
    app.mainloop()
