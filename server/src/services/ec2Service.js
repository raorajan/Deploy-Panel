const { NodeSSH } = require("node-ssh");
const fs = require("fs");

const ssh = new NodeSSH();

const deployContainerToEC2 = async ({
    clientName,
    image,
    domain,
}) => {

    const containerName = `client-${clientName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}`;

    try {

        // Read PEM file properly
        const privateKey = fs.readFileSync(
            process.env.EC2_SSH_KEY_PATH,
            "utf8"
        );

        await ssh.connect({
            host: process.env.EC2_HOST,
            username: process.env.EC2_USERNAME,
            privateKey,
        });

        console.log("✅ Connected to EC2");

        /**
         * Pull latest Docker image
         */
        console.log(`📥 Pulling Docker image: ${image}`);

        await ssh.execCommand(
            `sudo docker pull ${image}`
        );

        /**
         * Remove old container if exists
         */
        console.log(`🗑 Removing old container if exists`);

        await ssh.execCommand(
            `sudo docker rm -f ${containerName}`
        );

        /**
         * Run new container
         */
        console.log(`🐳 Starting Docker container`);

        // Run container and publish exposed ports to random host ports (-P)
        const dockerCommand = `sudo docker run -d --name ${containerName} -P ${image}`;

        const result = await ssh.execCommand(dockerCommand);

        if (result.stderr && result.stderr.trim()) {
            throw new Error(result.stderr.trim());
        }

        const containerId = (result.stdout || '').trim().split('\n')[0];

        // Inspect published port for container port 80
        let hostPort = null;
        try {
            const portResult = await ssh.execCommand(`sudo docker port ${containerId} 80`);
            if (portResult.stdout) {
                // Example output: 0.0.0.0:32768 or :::32768
                const m = portResult.stdout.match(/:(\d+)/);
                if (m) hostPort = parseInt(m[1], 10);
            }
        } catch (e) {
            // ignore port parsing errors but log
            console.warn('Could not determine host port mapping:', e.message || e);
        }

        console.log("✅ Docker deployed successfully", { containerId, hostPort });

        ssh.dispose();

        return {
            success: true,
            containerId,
            containerPort: hostPort,
            domain,
        };

    } catch (error) {

        ssh.dispose();

        console.error("❌ EC2 Deployment Error:", error);

        return {
            success: false,
            error: error.message,
        };
    }
};

module.exports = deployContainerToEC2;