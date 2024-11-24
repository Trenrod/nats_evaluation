from diagrams import Diagram, Cluster
from diagrams.aws.compute import EC2
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB
from diagrams.onprem.inmemory import Redis
from diagrams.programming.language import Nodejs
from diagrams.generic.device import Mobile
from diagrams.programming.language import Cpp
from diagrams.custom import Custom
from diagrams.onprem.queue import Nats
from diagrams.onprem.compute import Server

# STEP 1
# - Mobile clients wants to connect to on-Premise Server
# >>
# STEP 2
# - Server register to Cloud platform
# - server establishes a WebSocket connection
# >>
# STEP 3
# - Client ask Loadbalancer to which Proxy to connect to
# - Client connects to correct Proxy
# >>

with Diagram("Client_Server_Messaging_NATS", show=False, direction="TB"):
    mobileA = Mobile("ClientA\nid:A")
    mobileB = Mobile("ClientB\nid:B")
    serverA = Server("ServerA\nid:A")
    serverB = Server("ServerB\nid:B")

    with Cluster("Cloud platform"):
        with Cluster("NATS Cluster"):
            nats_node1 = Nats("Node1")
            nats_node2 = Nats("Node2")
            nats_node3 = Nats("Node3")
            nats_node1 - nats_node2
            nats_node1 - nats_node3

        with Cluster("Authentication services"):
            authServices = Nodejs("AuthService")
            authServices >> nats_node1
            mobileA >> authServices
            mobileB >> authServices

        with Cluster("Service Pools"):
            services = [
                Nodejs("MetaDirectory"),
                Nodejs("UserManager"),
                Nodejs("KurentoClient"),
                Nodejs("VoiceServices"),
            ]
            services >> nats_node2

    nats_node2 << serverA
    nats_node3 << serverB

    mobileA >> nats_node1
    mobileB >> nats_node1
