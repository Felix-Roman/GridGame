namespace GridGame2026
{
    partial class GridGameServerHoster
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            ConsoleLogWindowLabel = new Label();
            StartLocalServerButton = new Button();
            StopLocalServerButton = new Button();
            FrontEndPathTextBox = new TextBox();
            BackEndPathTextBox = new TextBox();
            FrontEndDirectoryPathLabel = new Label();
            BackEndDirectoryPathLabel = new Label();
            SuspendLayout();
            // 
            // ConsoleLogWindowLabel
            // 
            ConsoleLogWindowLabel.Location = new Point(12, 9);
            ConsoleLogWindowLabel.Name = "ConsoleLogWindowLabel";
            ConsoleLogWindowLabel.Size = new Size(690, 828);
            ConsoleLogWindowLabel.TabIndex = 0;
            ConsoleLogWindowLabel.Text = "Console Log Window";
            // 
            // StartLocalServerButton
            // 
            StartLocalServerButton.Location = new Point(708, 4);
            StartLocalServerButton.Name = "StartLocalServerButton";
            StartLocalServerButton.Size = new Size(222, 90);
            StartLocalServerButton.TabIndex = 1;
            StartLocalServerButton.Text = "Start Local Server";
            StartLocalServerButton.UseVisualStyleBackColor = true;
            StartLocalServerButton.Click += StartLocalServerButton_Click;
            // 
            // StopLocalServerButton
            // 
            StopLocalServerButton.Location = new Point(936, 4);
            StopLocalServerButton.Name = "StopLocalServerButton";
            StopLocalServerButton.Size = new Size(222, 90);
            StopLocalServerButton.TabIndex = 2;
            StopLocalServerButton.Text = "Stop Local Server";
            StopLocalServerButton.UseVisualStyleBackColor = true;
            StopLocalServerButton.Click += StopLocalServerButton_Click;
            // 
            // FrontEndPathTextBox
            // 
            FrontEndPathTextBox.Location = new Point(708, 125);
            FrontEndPathTextBox.Name = "FrontEndPathTextBox";
            FrontEndPathTextBox.Size = new Size(450, 31);
            FrontEndPathTextBox.TabIndex = 3;
            FrontEndPathTextBox.Text = "D:\\OneDrive\\Desktop\\CPTS421 GridGame\\GridGame2026\\GridGame2026\\GridGame2026FrontEnd";
            // 
            // BackEndPathTextBox
            // 
            BackEndPathTextBox.Location = new Point(708, 187);
            BackEndPathTextBox.Name = "BackEndPathTextBox";
            BackEndPathTextBox.Size = new Size(450, 31);
            BackEndPathTextBox.TabIndex = 4;
            BackEndPathTextBox.Text = "D:\\OneDrive\\Desktop\\CPTS421 GridGame\\GridGame2026\\GridGame2026\\GridGame2026BackEnd";
            // 
            // FrontEndDirectoryPathLabel
            // 
            FrontEndDirectoryPathLabel.AutoSize = true;
            FrontEndDirectoryPathLabel.Location = new Point(708, 97);
            FrontEndDirectoryPathLabel.Name = "FrontEndDirectoryPathLabel";
            FrontEndDirectoryPathLabel.Size = new Size(205, 25);
            FrontEndDirectoryPathLabel.TabIndex = 5;
            FrontEndDirectoryPathLabel.Text = "Front End Directory Path";
            // 
            // BackEndDirectoryPathLabel
            // 
            BackEndDirectoryPathLabel.AutoSize = true;
            BackEndDirectoryPathLabel.Location = new Point(708, 159);
            BackEndDirectoryPathLabel.Name = "BackEndDirectoryPathLabel";
            BackEndDirectoryPathLabel.Size = new Size(199, 25);
            BackEndDirectoryPathLabel.TabIndex = 6;
            BackEndDirectoryPathLabel.Text = "Back End Directory Path";
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(10F, 25F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(1445, 846);
            Controls.Add(BackEndDirectoryPathLabel);
            Controls.Add(FrontEndDirectoryPathLabel);
            Controls.Add(BackEndPathTextBox);
            Controls.Add(FrontEndPathTextBox);
            Controls.Add(StopLocalServerButton);
            Controls.Add(StartLocalServerButton);
            Controls.Add(ConsoleLogWindowLabel);
            Name = "Form1";
            Text = "Form1";
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private Label ConsoleLogWindowLabel;
        private Button StartLocalServerButton;
        private Button StopLocalServerButton;
        private TextBox FrontEndPathTextBox;
        private TextBox BackEndPathTextBox;
        private Label FrontEndDirectoryPathLabel;
        private Label BackEndDirectoryPathLabel;
    }
}
