using System.Diagnostics;

namespace GridGame2026
{
    public partial class GridGameServerHoster : Form
    {
        // These are variables that hold the terminal processes that run the server
        private Process backendProcess;
        private Process frontendProcess;

        /// <summary>
        /// Basic Constructor method
        /// </summary>
        public GridGameServerHoster()
        {
            InitializeComponent();
        }

        /// <summary>
        /// boots up two command prompts and runs "npm run dev" on the frontend and backend of GridGame2026
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void StartLocalServerButton_Click(object sender, EventArgs e)
        {
            // If changes were made but nothing looks changed do npm run build on the frontend and backend
            try
            {
                // If either process object exists and hasn't been closed, the servers are already active
                if ((backendProcess != null && !backendProcess.HasExited) || (frontendProcess != null && !frontendProcess.HasExited))
                {
                    MessageBox.Show("Servers are already running!", "Already Running", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return; // Stop executing this method so no new or extra terminals are open
                    // *IMPORTANT ^*
                }

                // Get paths from the text boxes and trim any accidental whitespace
                string backendPath = BackEndPathTextBox.Text.Trim();
                string frontendPath = FrontEndPathTextBox.Text.Trim();

                // Verify that the directories exist before launching
                if (!Directory.Exists(backendPath) || !Directory.Exists(frontendPath))
                {
                    MessageBox.Show(
                        "One or both of the specified paths do not exist. Please verify the text boxes.\n\n" +
                        $"Backend Path: {backendPath}\n" +
                        $"Frontend Path: {frontendPath}",
                        "Directory Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                // Start Backend Process
                backendProcess = new Process();
                backendProcess.StartInfo.FileName = "cmd.exe";
                backendProcess.StartInfo.Arguments = "/k npm run dev";
                backendProcess.StartInfo.WorkingDirectory = backendPath;
                backendProcess.StartInfo.UseShellExecute = true;
                backendProcess.Start();

                // Start Frontend Process
                frontendProcess = new Process();
                frontendProcess.StartInfo.FileName = "cmd.exe";
                frontendProcess.StartInfo.Arguments = "/k npm run dev";
                frontendProcess.StartInfo.WorkingDirectory = frontendPath;
                frontendProcess.StartInfo.UseShellExecute = true;
                frontendProcess.Start();

                // Show success of method
                MessageBox.Show("Backend and Frontend servers started successfully!", "Servers Running", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                // Any crash should report specifics to user/Client. this could also be a permission issue if this keeps getting caught, not a bug in the code.
                MessageBox.Show($"Error starting servers: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        /// <summary>
        /// Ends both terminals if they are open, ends early if no processes are detected.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void StopLocalServerButton_Click(object sender, EventArgs e)
        {
            try
            {
                // If both processes are null (never started) or have already been closed manually by the user
                if ((backendProcess == null || backendProcess.HasExited) &&
                    (frontendProcess == null || frontendProcess.HasExited))
                {
                    MessageBox.Show("No servers are currently running.", "Not Running", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return; // Stop execution since there is nothing to kill
                            // *IMPORTANT ^*
                }

                // Ends backend terminal and safely clears reference
                if (backendProcess != null)
                {
                    try { if (!backendProcess.HasExited) backendProcess.Kill(); } catch { }
                    backendProcess.Dispose();

                    // Reset reference so it can start again later
                    backendProcess = null;
                }

                // Ends frontend terminal and safely clears reference
                if (frontendProcess != null)
                {
                    try { if (!frontendProcess.HasExited) frontendProcess.Kill(); } catch { }
                    frontendProcess.Dispose();

                    // Reset reference so it can start again later
                    frontendProcess = null;
                }

                // Force-kill lingering node processes
                Process.Start(new ProcessStartInfo
                {
                    FileName = "taskkill",
                    Arguments = "/f /im node.exe",
                    CreateNoWindow = true,
                    UseShellExecute = false
                });

                MessageBox.Show("Servers stopped.", "Stopped", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error stopping servers: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}