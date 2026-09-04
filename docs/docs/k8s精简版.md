# K8s 知识精简总结（面试向）

> 本文档由《走进 Docker 的世界》《Kubernetes 安装 / 落地实践 / 进阶实践》《EFK 日志》《Prometheus 监控》《DevOps 平台实践》《sharedLibrary 的 CICD 优化》《SpringCloud 微服务项目交付》《Istio 微服务治理》十篇文档精炼而成。
>
> - 已删除全部配图，结构 / 流程 / 架构改用 **ASCII 文字图** 表达；
> - 操作命令、YAML、代码块 **逐字保留**，未做改写；
> - 用 `> 💡 **面试重点：**` 标记常考知识点；
> - 风格：通俗易懂、简洁明了，保留不可替代的核心原理。

## 目录

1. [走进 Docker 的世界](#一走进-docker-的世界)
2. [Kubernetes 安装部署](#二kubernetes-安装部署)
3. [Kubernetes 落地实践之旅](#三kubernetes-落地实践之旅)
4. [Kubernetes 进阶实践](#四kubernetes-进阶实践)
5. [基于 EFK 的 Kubernetes 日志采集方案](#五基于-efk-的-kubernetes-日志采集方案)
6. [基于 Prometheus 的 Kubernetes 监控方案](#六基于-prometheus-的-kubernetes-监控方案)
7. [基于 Kubernetes 的 DevOps 平台实践](#七基于-kubernetes-的-devops-平台实践)
8. [基于 sharedLibrary 的 CICD 流程优化](#八基于-sharedlibrary-的-cicd-流程优化)
9. [SpringCloud 微服务项目交付](#九springcloud-微服务项目交付)
10. [基于 Istio 实现微服务治理](#十基于-istio-实现微服务治理)

---

## 一、走进 Docker 的世界

### 1. 为什么需要 Docker

传统虚拟机（Hypervisor）需自带 Guest OS 完整内核，重、启动慢；容器共享宿主机内核，轻、启动快。

```
+---------- 虚拟机 (Hypervisor) ----------+    +------------- 容器 (Docker) -------------+
|  Guest OS (完整内核)                    |    |  App A            App B               |
|    App A          App B                |    |     \              /                  |
|       \              /                 |    |      \            /                   |
|   共享硬件 + Hypervisor(完全隔离)      |    |  共享宿主机内核 + 容器引擎(轻量隔离)  |
+----------------------------------------+    +----------------------------------------+
            较重 / 启动慢                              轻量 / 启动快
```

> 💡 **面试重点：** 容器与虚拟机的本质区别——容器共享宿主机内核、轻量快速；虚拟机自带完整 Guest OS、隔离更强但更重。

Docker 底层利用 LXC（Linux 容器）实现资源隔离与限制。容器运行时代表：Docker、CoreOS Rkt、Podman。

### 2. Docker 是什么 / 架构

基于操作系统内核、提供轻量级虚拟化的 CS 架构软件。

**定义**：轻量容器化工具，将程序、依赖、运行环境打包，实现一次打包任意机器运行。

**对比虚拟机**：共享宿主机内核，占用资源少、秒级启动；虚拟机自带完整系统，笨重缓慢。

四大核心

- 引擎：Docker 后台服务，执行所有操作命令
- 镜像：只读环境模板（如 mysql、nginx）
- 容器：镜像运行后的可读写实例
- 镜像仓库：存储、下载镜像的平台

**使用流程**：拉取镜像→运行容器-->容器内部署业务程序；自定义项目通过 Dockerfile 打包成镜像分发。

**核心优点**：环境统一、资源省、部署快、方便微服务与自动化发布。

**一句话总结**：解决环境不一致问题，轻量化打包部署应用。

适用场景: 本地搭建多套测试环境；CI/CD 自动化流水线打包发布。

​		          无状态服务（Nginx、Tomcat、SpringBoot 后端、前端）→ 生产最推荐容器化



```
+------------------+       REST API        +---------------------------+
|  Docker Client   | <-------------------> |     Docker Daemon         |
|  (docker CLI)    |                       |     (dockerd)             |
+------------------+                       +---------------------------+
                                                  | 管理
                          +-----------------------+-----------------------+
                          v                       v                       v
                      [镜像 Image]           [容器 Container]        [仓库 Registry]
```

- 版本：CE（社区版）/ EE（企业版）。
- 发展史：1.8 前用 LXC，后抽出 libcontainer；2015 成立 OCI（开放容器标准）。
- OCI 维护 **runC**（libcontainer，符合 OCI 标准、对接内核）。
- **containerd** 剥离自 dockerd，向上提供 gRPC，向下经 containerd-shim 调 runC。



```
Docker Daemon (dockerd)
        |  gRPC 接口
        v
     containerd  (镜像管理 / 容器执行调用)
        |  containerd-shim
        v
     runC (libcontainer)  -->  Linux 内核 (Namespace + Cgroup)
```

> 💡 **面试重点：** runC 是符合 OCI 标准的低层运行时（对接内核）；containerd 是上层运行时（镜像/容器管理）；dockerd 是最上层与 CLI 交互的进程。

> 💡 **containerd vs containerd-shim 分工：** containerd = 大管家（常驻 1 个，管镜像、容器生命周期调度，向上提供 gRPC）；**containerd-shim = 每容器 1 个的贴身守护**——runC 创建完容器就退出，shim 收养容器主进程当父进程，负责转发 stdout/stderr、转发信号、上报退出码。**解耦价值：上层 daemon（dockerd/containerd）重启时容器不挂**，这就是 `systemctl restart docker` 容器照常运行的原理。Kata/gVisor 等安全运行时也是通过替换 shim（runtime class）接入的。



### Docker 整体架构（C/S 客户端 - 服务端架构）

Docker 采用 **Client-Server（C/S）** 模型，分为四大核心模块：客户端、Docker 守护进程、镜像仓库、容器运行环境。

#### 1. Client 客户端

就是你敲命令的地方（`docker run/pull/build` 等）

- 交互入口：CLI 命令行、Docker Desktop、SDK
- 作用：发送请求给 Docker Daemon，**不直接操作容器 / 镜像**

#### 2. Daemon（dockerd 守护进程，服务端核心）

后台常驻服务，Linux 系统后台进程，Docker 真正干活的核心。引擎内部不是单个进程，而是**三层协作**，命令从 dockerd 一路下放到内核：

##### dockerd（最上层 · 面向人 / 镜像 / 网络 / 卷）

职责（这些"上层活"全部是 dockerd 的，containerd 不掺和）：
- **对外 API 服务**：REST API，接收客户端（CLI / Docker Desktop / SDK）请求
- **镜像构建**：读 Dockerfile 逐层 build（`docker build` 只在 dockerd）
- **镜像仓库交互**：`docker login` / `push` / `pull` 的认证与传输（拉下来的镜像内容交给 containerd 存储）
- **网络管理（libnetwork）**：创建 bridge / overlay 网络、`-p` 端口映射、容器 DNS
- **存储卷管理**：`docker volume` 创建、挂载、对接卷驱动
- **容器"组装层"**：解析 `docker run` 参数（env / 端口 / 挂载 / 资源限制）拼成一份完整配置
- **附带管理**：日志驱动、健康检查、restart 策略、swarm 集群

→ 配置拼好后，把"真正把容器建起来跑起来"这个执行活交给 containerd。

##### containerd（中层 · 容器运行时）

负责：
- 容器生命周期执行：create / start / stop / delete / exec（docker 这些命令最终都落到它）
- 镜像内容存储：拉取镜像层 → content store → 解包成快照 snapshot（容器可写层）
- 为每个容器拉起 containerd-shim 守护进程（收容容器主进程）

不负责（全是 dockerd 的活）：docker volume、docker network、镜像构建（Dockerfile）、push / login

##### runc（底层 · OCI 标准运行时）

遵循 OCI 标准，直接调用 Linux 内核能力（namespace、cgroups）实现资源隔离、限制。

#### 3. Registry 镜像仓库

存放镜像的远程服务器（可以理解成"镜像版的 Git 仓库"：`push` 上传、`pull` 下载、用标签区分版本）。

- 官方公共：Docker Hub（默认仓库，写 `nginx` 等于 `docker.io/library/nginx`）
- 私有仓库：Harbor、阿里云镜像仓库、AWS ECR

**镜像怎么寻址**：`仓库地址/项目名/镜像名:标签`，如 `registry.cn-hangzhou.aliyuncs.com/myproj/nginx:1.25`。不写标签默认 `latest`（生产环境别用 latest，无法回滚）。

**流程（呼应 dockerd 职责第 3 条）**：dockerd 负责和 Registry 打交道 —— `login` 认证、拉 manifest、下载分层 blob；拉下来的内容交给 containerd 存进 content store。所以"传输"是 dockerd 的活，containerd 只管"存"。

pull 是**分层并行下载**：本地已有的层直接复用、不重复传。

#### 4. 内核支撑技术（底层隔离基础）

容器不是 Docker 发明的技术，本质就是 Linux 内核的三种能力；**真正调用它们的不是 dockerd，而是最底层的 runc**：

1. **Namespace（隔离"看得见什么"）**：把系统资源包进独立命名空间，容器之间互相看不见。共六项：
   - `pid` 进程树 ／ `net` 网络栈 ／ `mnt` 挂载点 ／ `uts` 主机名 ／ `ipc` 进程间通信 ／ `user` 用户与权限
2. **Cgroups（限制"能用多少"）**：限制 CPU、内存、磁盘 IO，防止单个容器把宿主机资源吃光
3. **Union FS（决定"文件怎么叠"）**：镜像分层，下面多层只读复用 + 最顶一个可写层，靠 **CoW 写时复制**（要改下层文件时，先把文件拷到可写层再改）。所以容器启动快、镜像省空间

Union FS 补充：它是"分层合并"这类能力的统称 —— 把多个目录（层）叠加挂载成一个统一视图，**上层覆盖下层、下层只读复用**。它只定义能力，不规定实现：

- 真正的联合文件系统：AUFS、OverlayFS（Docker 现在默认用 **overlay2**）
- Docker 的**存储驱动（storage driver）**还包括 devicemapper、btrfs、zfs、vfs —— 这些**不是** Union FS，是靠 CoW 实现分层的另一套机制（早期版本或特殊场景才用）

一句话区分三者：**Namespace 管隔离边界，Cgroups 管资源上限，Union FS 管文件分层。**

#### 完整调用流程举例（docker run nginx）

以本地没有 nginx 镜像为例，完整链路走一遍：

1. **客户端**：敲 `docker run nginx`，CLI 通过 REST API 把请求发给 dockerd
2. **dockerd 组装**：解析参数（端口 / env / 挂载 / 资源限制），拼成一份完整容器配置
3. **dockerd 查本地镜像** → 没有 → 去 Registry 拉：认证、拉 manifest、下载分层 blob（已存在的层复用）
4. **dockerd 交镜像**：拉下来的内容交给 containerd → 存进 content store → 解包成快照（容器的只读层）
5. **containerd 建容器**：准备 rootfs 和可写层（网络由 dockerd 的 libnetwork 提前配好），拉起 containerd-shim，由 shim 调用 **runc**
6. **runc 造进程**：调内核 namespace + cgroups 把 nginx 进程隔离起来；**runc 建完就退出**，容器进程交给 shim 收养托管
7. **返回**：nginx 主进程在隔离环境里跑起来，容器 ID 返回给客户端

一句话串起来：**dockerd 组装 + 拉镜像 → containerd 调度 + 存储 → shim 托管 → runc 隔离 → 内核执行。**

#### 极简架构总结

主链路（纵向，越往右越底层）：

客户端（发命令）→ **dockerd**（组装 + 调度 + 与 Registry 交互）→ **containerd**（生命周期 + 镜像存储 + 拉起 shim）→ **runc**（调内核做隔离）→ **Linux 内核**（Namespace / Cgroups / Union FS）

旁路：Registry 是**侧挂**在 dockerd 上的（只在拉/推镜像那一步被访问），不在主执行链路上。





### 3. 安装要点



```bash
#centos7 升级内核 6.9版本
# https://dl.lamp.sh/kernel/el7/
wget https://dl.lamp.sh/kernel/el7/kernel-ml-devel-6.9.10-1.el7.x86_64.rpm
wget https://dl.lamp.sh/kernel/el7/kernel-ml-6.9.10-1.el7.x86_64.rpm

yum localinstall -y  kernel-ml-6.9.10-1.el7.x86_64.rpm kernel-ml-devel-6.9.10-1.el7.x86_64.rpm

#安装完毕后查看系统可用启动内核
awk -F\' '$1=="menuentry " {print  $2}' /etc/grub2.cfg

# 修改默认的启动内核
grub2-set-default 'CentOS Linux (6.9.10-1.el7.x86_64) 7 (Core)'
grub2-editenv list

reboot
uname -r
-----------------------------------------------------------------
## 若未配置，需要执行如下
#加载网桥过滤模块
modprobe br_netfilter
cat <<EOF > /etc/modules-load.d/br_netfilter.conf
br_netfilter
EOF
cat <<EOF >  /etc/sysctl.d/docker.conf
# 让 iptables 防火墙规则生效在网桥转发流量上。
# 1：网桥流量同样走 iptables 链做 NAT、过滤、端口转发
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
# 开启 Linux 内核 IPv4 数据包转发。
net.ipv4.ip_forward=1
EOF
sysctl -p /etc/sysctl.d/docker.conf
# 检查
sysctl net.bridge.bridge-nf-call-iptables net.bridge.bridge-nf-call-ip6tables net.ipv4.ip_forward
```

```bash
#docker 安装
# https://mirrors.huaweicloud.com/mirrorDetail/5ea14d84b58d16ef329c5c13?mirrorName=docker-ce&catalog=docker
sudo yum remove docker docker-common docker-selinux docker-engine
sudo yum install -y yum-utils device-mapper-persistent-data lvm2
wget -O /etc/yum.repos.d/docker-ce.repo https://mirrors.huaweicloud.com/docker-ce/linux/centos/docker-ce.repo
sudo sed -i 's+download.docker.com+mirrors.huaweicloud.com/docker-ce+' /etc/yum.repos.d/docker-ce.repo
sudo yum makecache fast
sudo yum install docker-ce

#华为云的镜像加速地址
https://console.huaweicloud.com/swr/?region=cn-north-4#/swr/mirror
进入华为云搜索“容器镜像服务”或者 "SWR" ，进入控制台
点击 “镜像资源”---> “镜像中心”---> "镜像加速器"
cat <<EOF > /etc/docker/daemon.json
{
    "registry-mirrors": [ "https://4c0c57d8b79a402d811834c1be74f7ae.mirror.swr.myhuaweicloud.com" ]
}
EOF

## 设置开机自启
systemctl enable docker  
systemctl daemon-reload

## 启动docker
systemctl start docker 

## 查看docker信息
docker info
## docker-client
which docker
## docker daemon
ps aux |grep docker
## containerd
ps aux|grep containerd
systemctl status containerd

```

### 4. 三大核心要素与常用操作

```
        +-------------------+
        |   镜像 Registry   |   (Docker Hub / Harbor)
        +-------------------+
                 |  pull / push
                 v
        +-------------------+
        |     镜像 Image     |   (静态包: 业务代码 + 运行环境)
        +-------------------+
                 |  run
                 v
        +-------------------+
        |   容器 Container   |   (运行时, 可对外提供服务)
        +-------------------+
```

- 镜像：静态包，不能直接服务；容器：镜像的运行时；仓库：存镜像。
- 公网地址形如 `registry.devops.com/demo/hello:latest`，缺省解析为 `docker.io/library/xxx:latest`。

```bash
# Docker 命令分类（按图中模块划分）
一、镜像相关 Images
1. 镜像基础操作
    images：列出本地所有镜像
    rmi：删除镜像
    tag：给镜像打标签
    history：查看镜像分层构建历史
2. 镜像构建
    build：通过 Dockerfile 构建镜像
3. 镜像本地导入导出（Tar 包）
    save：镜像导出为 tar 文件
    	docker save -o nginx-alpine.tar nginx:alpine
    load：从 tar 文件导入镜像
    	docker load -i nginx-alpine.tar
    export：容器导出为 tar 文件
    import：容器 tar 包导入生成镜像
4. 镜像仓库 Registry 交互
    pull：从仓库拉取镜像到本地
    	docker pull nginx:alpine
    push：推送本地镜像到仓库
    search：搜索仓库镜像
    login：登录镜像仓库
    logout：退出镜像仓库登录
5. 容器生成镜像
	commit：把运行中的容器打包生成新镜像
6. 对比容器与镜像差异
	diff：查看容器相对于底层镜像的文件改动
二、容器相关 Container
1. 容器生命周期（状态流转）
创建容器
    create：创建容器（不启动）
    run：创建并立刻启动容器
    运行 / 停止 / 暂停状态切换
    start：启动已停止容器
    stop：优雅停止运行容器
    kill：强制杀死运行容器
    pause：暂停容器所有进程
    unpause：恢复暂停的容器
删除容器
	rm：删除停止状态的容器
2. 容器信息查看
    ps：列出容器
    inspect：查看容器详细元数据
    port：查看容器端口映射
    top：查看容器内进程
    logs：查看容器日志
    wait：阻塞等待容器停止并返回退出码
3. 容器交互操作
    attach：附着到容器前台终端
    exec：在运行容器内执行命令（进入容器终端常用）
    cp：宿主机与容器之间互传文件 / 文件夹

三、宿主机与容器文件传输 Host
	cp：容器 ↔ 宿主机 文件 / 文件夹拷贝
四、Dockerfile 构建镜像
	build：读取 Dockerfile 构建镜像
五、Tar 文件（镜像 / 容器打包）
    save：镜像导出 tar
    load：tar 导入镜像
    export：容器导出 tar
    import：容器 tar 导入为镜像
六、镜像仓库 Registry
	pull、push、search、login、logout
七、Docker Engine 引擎全局信息
    version：查看 Docker 客户端 / 服务端版本
    info：查看 Docker 系统全局信息（存储、容器、镜像数量等）
    events：实时监听 Docker 后台事件（创建 / 删除容器、拉取镜像等）
    
    
docker images
docker pull nginx:alpine
docker tag nginx:alpine 172.21.51.143:5000/nginx:alpine
docker build . -t my-nginx:ubuntu -f Dockerfile
docker run --name my-nginx-alpine -d nginx:alpine
docker run --name nginx -d -p 8080:80 nginx:alpine
docker run --memory=500m nginx:alpine
docker exec -ti my-nginx-alpine /bin/sh
docker save -o nginx-alpine.tar nginx:alpine
docker load -i nginx-alpine.tar
docker rmi nginx:alpine
docker rm -f nginx
docker logs --tail=100 -f nginx
docker inspect nginx
```

推送私有仓库（带认证 + insecure 跳过 HTTPS 校验）：

```bash
# 创建 Docker Registry 认证文件目录
mkdir /var/lib/registry_auth

# 使用 htpasswd 来创建加密文件
[ -f /usr/bin/htpasswd ] || yum install -y httpd-tools
htpasswd -Bbn admin admin > /var/lib/registry_auth/htpasswd
#-B：使用 bcrypt 加密密码（安全性更高，推荐）
#-b：批量模式，直接在命令行传入用户名 + 密码，不用交互式输入
#-n：不输出到终端，输出标准输出


## 使用docker镜像启动镜像仓库服务
docker run -p 5000:5000 \
--restart=always \
--name registry \
-v /var/lib/registry:/var/lib/registry \
-v /var/lib/registry_auth/:/auth/ \
-e "REGISTRY_AUTH=htpasswd" \
-e "REGISTRY_AUTH_HTPASSWD_REALM=Registry Realm" \
-e "REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd" \
-d registry

docker run -p 5000:5000 \          # 端口映射：宿主机5000映射容器5000
--restart=always \                 # 容器异常/开机自动重启
--name registry \                  # 容器命名registry
-v /var/lib/registry:/var/lib/registry \  # 持久化镜像存储目录 宿主机位置:容器内位置
-v /var/lib/registry_auth/:/auth/ \      # 挂载账号密码文件目录
-e "REGISTRY_AUTH=htpasswd" \      # 启用htpasswd账号密码认证
-e "REGISTRY_AUTH_HTPASSWD_REALM=Registry Realm" \ # 登录提示域名
-e "REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd" \ # 指定密码文件容器内路径
-d registry                        # 后台运行registry官方仓库镜像
# -e 是添加容器内环境变量
# -d 后台守护进程运行容器，不占用当前终端


## docker默认不允许向http的仓库地址推送，如何做成https的，参考：https://docs.docker.com/registry/deploying/#run-an-externally-accessible-registry
## 我们没有可信证书机构颁发的证书和域名，自签名证书需要在每个节点中拷贝证书文件，比较麻烦，因此我们通过配置daemon的方式，来跳过证书的验证：
vim /etc/docker/daemon.json
{
    "registry-mirrors": [ "https://4c0c57d8b79a402d811834c1be74f7ae.mirror.swr.myhuaweicloud.com" ],
    "insecure-registries": ["10.0.0.80:5000"]
}

systemctl restart docker
docker login 10.0.0.80:5000
Username: admin
Password: admin


docker pull nginx:alpine
docker tag nginx:alpine 10.0.0.80:5000/nginx:alpine
docker push 10.0.0.80:5000/nginx:alpine


## 查看仓库内元数据
curl -u admin:admin -X GET http://10.0.0.80:5000/v2/_catalog
curl -u admin:admin  -X GET http://10.0.0.80:5000/v2/nginx/tags/list

docker rmi nginx:alpine



```

**docker命令练习**

```bash
## 查看运行状态的容器列表
docker ps
## 查看全部状态的容器列表
docker ps -a
## 后台启动
docker run --name nginx -d nginx:alpine
## 映射端口,把容器的端口映射到宿主机中,-p <host_port>:<container_port>
docker run --name nginx -d -p 8080:80 nginx:alpine
## 资源限制,最大可用内存500M
docker run --memory=500m nginx:alpine
## 挂载主机目录
docker run --name nginx -d  -v /opt:/opt  nginx:alpine
docker run --name mysql -e MYSQL_ROOT_PASSWORD=123456  -d -v /opt/mysql/:/var/lib/mysql mysql:5.7

# 进入容器或者执行容器内的命令
docker exec -ti <container_id_or_name> /bin/sh
# -t：分配伪终端，支持交互
# -i：保持标准输入打开
# -ti：组合，实现交互式进容器
docker exec <container_id_or_name> hostname命令

# 主机与容器之间拷贝数据
## 主机拷贝到容器
echo '123'>/tmp/test.txt
docker cp /tmp/test.txt nginx:/tmp
docker exec nginx cat /tmp/test.txt
## 容器拷贝到主机
docker cp nginx:/tmp/test.txt ./

## 查看全部日志
docker logs nginx
## 实时查看最新日志
docker logs -f nginx
## 从最新的100条开始查看
docker logs --tail=100 -f nginx

## 停止运行中的容器
docker stop nginx
## 启动退出容器
docker start nginx
## 删除非运行中状态的容器
docker rm nginx
## 删除运行中的容器
docker rm -f nginx

## 查看容器详细信息，包括容器IP地址等
$ docker inspect nginx
## 查看镜像的明细信息
$ docker inspect nginx:alpine
```



### 5. Dockerfile 关键指令

```bash
docker build . -t ImageName:ImageTag -f Dockerfile
```

- `FROM`：基础镜像，必须首条。
- `RUN`：构建期执行，生成可缓存中间层。
- `COPY/ADD`：拷贝本地文件。
- `WORKDIR`：工作目录。
- `ENV`：环境变量。
- `EXPOSE`：仅声明端口，需 `-p` 发布。
- `CMD`：容器启动命令；`docker run` 后命令会覆盖它。
- `ENTRYPOINT`：容器入口，run 后参数作为其参数，不被覆盖；仅允许一个。

> 💡 **面试重点：** CMD 可被 `docker run` 后的命令覆盖；ENTRYPOINT 不可被覆盖、会接收附加参数；二者共存时 CMD 作为参数传给 ENTRYPOINT。



```bash
Dockerfile使用
docker build . -t ImageName:ImageTag -f Dockerfile

FROM 指定基础镜像，必须为第一个命令
MAINTAINER 镜像维护者的信息
COPY|ADD 添加本地文件到镜像中
WORKDIR 工作目录
RUN 构建镜像过程中执行命令
CMD 构建容器后调用，也就是在容器启动时才进行调用
ENTRYPOINT 设置容器初始化命令，使其可执行化
ENV
EXPOSE   容器内端口
----------------------------------------------------
# 1. FROM：指定基础镜像，必须首行
FROM centos:7
# 2. RUN：构建时执行shell命令
RUN yum install nginx -y
# 3. COPY：宿主机文件/目录复制到容器
COPY ./index.html /usr/share/nginx/html/
# 4. ADD：类似COPY，自动解压tar、支持远程url
ADD test.tar.gz /opt/
# 5. WORKDIR：设置容器工作目录，后续命令默认在此执行
WORKDIR /app
# 6. ENV：定义环境变量
ENV VERSION=1.0
# 7. ARG：构建时传入临时参数，镜像内不保留
ARG build_user
# 8. EXPOSE：声明容器暴露端口（仅说明，不自动映射）
EXPOSE 80
# 9. VOLUME：声明数据卷，持久化目录
VOLUME ["/data"]
# 10. CMD：容器启动默认命令，docker run可覆盖
CMD ["nginx","-g","daemon off;"]
# 11. ENTRYPOINT：容器入口程序，CMD仅作参数
ENTRYPOINT ["/bin/sh"]
# 12. USER：切换运行用户（默认root）
USER nginx
# 13. LABEL：给镜像添加元数据标签
LABEL author="admin"
# 14. HEALTHCHECK：容器健康检查
HEALTHCHECK --interval=3s CMD curl -s 127.0.0.1
```



### 6. 通过 1 号进程理解容器本质

```bash
docker run -d --name test-4 nginx:alpine ping www.luffycity.com
```

容器本质：利用 namespace + cgroup 在宿主机创建的隔离虚拟空间；容器内 pid=1 的进程即启动命令。容器共享内核，**无法在容器内升级内核**。

> 💡 **面试重点：** 容器是宿主机上的一个进程（pid 1 即入口命令），不是完整操作系统；共享内核、无法独立升级内核。



```
通过1号进程理解容器的本质
----------------------------------------------------------
-- 容器内 PID 1 是什么
容器启动后，容器内部的第一个进程就是 PID=1 进程，由runc依托 Linux Namespace 创建。
宿主机有完整 PID 树，容器拥有独立 PID Namespace：
宿主机看该进程是随机大 PID；
容器内部视角，它就是 PID=1。
本质上讲容器是利用namespace和cgroup等技术在宿主机中创建的独立的虚拟空间，这个空间内的网络、进程、挂载等资源都是隔离的。
------------------------------------------------------------
docker run -d --name xxx nginx:alpine <自定义命令>
# <自定义命令>会覆盖镜像中指定的CMD指令，作为容器的1号进程启动。
docker run -d --name test-3 nginx:alpine echo 123
docker run -d --name test-4 nginx:alpine ping www.badu.com
$ docker exec -ti test-4 /bin/sh
#/ ps aux
#/ ip addr
#/ ls -l /
#/ apt install xxx
#/ #安装的软件对宿主机和其他容器没有任何影响，和虚拟机不同的是，容器间共享一个内核，所以容器内没法升级内核
```





### 7. 多阶段构建（Multi-stage）

把编译环境与运行环境分离，最终镜像只含运行所需产物，大幅瘦身。

```dockerfile
FROM srinivasansekar/javamvn as builder
WORKDIR /opt/springboot-app
COPY  . .
RUN mvn clean package -DskipTests=true

FROM openjdk:8-jdk-alpine
COPY --from=builder /opt/springboot-app/target/sample.jar sample.jar
CMD [ "sh", "-c", "java -jar /sample.jar" ]
```



```bash
多阶段构建（极简理解）
1. 核心痛点
单阶段打包会把编译工具、源码、依赖包全塞进最终镜像，镜像体积巨大，包含无用编译环境。
2. 本质
一个 Dockerfile 里写多个 FROM，分出「构建阶段」+「运行阶段」：
构建阶段：带编译环境，编译代码生成可执行文件；
运行阶段：只用极简基础镜像，只拷贝上一阶段编译好的产物，丢弃所有编译工具 / 源码。
3. 关键语法
COPY --from=阶段名 源路径 目标路径：跨阶段复制文件。
4. 优点
镜像体积大幅缩小；
减少攻击面（无 gcc、maven、npm 等工具）；
无需手动导出文件，一条docker build完成。
5. 一句话总结
多阶段构建 =分开编译与运行环境，只保留程序运行必需文件，剔除编译冗余。


yum install -y git 
git clone --depth=1 https://gitee.com/chengkanghua/eladmin-web.git
#--depth=1：只拉取最新 1 次提交，不下载完整 git 历史，加速克隆、减小体积
cd eladmin-web/

# 多阶段构建dockerfile.multi
-------------------------------------------------------
cat <<EOF > Dockerfile.multi
# # 阶段1：编译阶段（大镜像，仅用来打包程序）
FROM codemantn/vue-node AS builder
LABEL maintainer="inspur_lyx@hotmail.com"

# config npm
RUN npm config set sass_binary_site  https://npmmirror.com/mirror/sass && \
    npm config set registry  https://registry.npmmirror.com
WORKDIR /opt/eladmin-web
COPY  . .

# build
RUN ls -l && npm install && npm run build:prod
# 阶段2：运行阶段（超轻量空镜像，只放成品）
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
# 只拷贝构建好的文件，编译器、源码全部丢弃
COPY --from=builder /opt/eladmin-web/dist /usr/share/nginx/html/
EXPOSE 80
EOF
----------------------------------------------------
docker build --no-cache . -t eladmin-web:v1 -f Dockerfile.multi
# --no-cache：构建时不使用旧镜像缓存，全部重新构建
# .：构建上下文为当前目录

# docker login 10.0.0.80:5000
docker tag eladmin-web:v1 10.0.0.80:5000/eladmin/eladmin-web:v1
docker push 10.0.0.80:5000/eladmin/eladmin-web:v1




----------------------------------------------------------------eladmin-api
docker search maven:alpine
docker run --rm -ti aerialist7/maven-git sh
# git clone --depth=1 https://gitee.com/chengkanghua/eladmin.git
# mvn clean package
#上面是手动测试 是否可行

git clone --depth=1 https://gitee.com/chengkanghua/eladmin.git
cd eladmin
cat > Dockerfile.multi <<EOF
FROM aerialist7/maven-git as builder
WORKDIR /opt/eladmin
COPY  . .
RUN mvn clean package

FROM java:8u111
WORKDIR /opt/eladmin
COPY --from=builder /opt/eladmin/eladmin-system/target/eladmin-system-2.6.jar .
CMD [ "sh", "-c", "java -Dspring.profiles.active=prod -jar eladmin-system-2.6.jar" ]
EOF

docker build . -t eladmin:v1 -f Dockerfile.multi
docker tag eladmin:v1 10.0.0.80:5000/eladmin/eladmin-api:v1
docker push 10.0.0.80:5000/eladmin/eladmin-api:v1

```





### 8. 实现原理

本质：Namespace 做资源隔离，Cgroup 做资源限制，UnionFS 做分层存储。

**Namespace 隔离**（docker 默认全开）：

| 分类 | 隔离内容 |
|------|----------|
| pid | 进程 ID;独立进程编号（容器内 PID 1，宿主机是大 PID） |
| net | 网络接口;独立网卡、IP、端口 |
| ipc | 进程间通信 |
| mnt | 文件系统挂载点 |
| uts | 主机名/域名 |
| user | 用户/用户组 |

**Cgroup 限制**：

```
Docker Daemon
     v
  CGroup (按资源划分的进程组)
   |-- cpu        CPU 配额/权重
   |-- memory     内存上限
   |-- blkio      磁盘 IO 限制
   |-- pids       进程数限制
     v
  容器进程 (受内核资源子系统约束)
  
限制容器 CPU、内存、磁盘 IO、网络带宽，防止单个容器耗尽宿主机资源。
```

> 💡 **面试重点：** Namespace 解决“隔离”（看得见但互不影响），Cgroup 解决“限制”（用多少资源），二者缺一不可。

### 9. UnionFS 分层与写时复制

镜像由多层组成（每条指令一层，只读）；运行容器时在最上层加一个可写“容器层”。

```
+---------------------------+
|   可写容器层            |  <-- 运行容器时新增(读写)
+---------------------------+
|   RUN make /app          |  镜像层(只读)
+---------------------------+
|   COPY . /app            |  镜像层(只读)
+---------------------------+
|   FROM ubuntu:15.04      |  基础层(只读)
+---------------------------+
```

- 写时复制（CoW）CoW就是copy-on-write ：仅在写入时才从镜像复制文件到本容器层，
- 多容器共享底层、互不污染。
- 存储驱动最新推荐 **overlay2**；早期用 aufs。

### 10. Docker 网络

4 种模式：`bridge`（默认）、`host`、`container`、`none`。

**bridge 模式**：docker0 虚拟网桥（二层交换机）连接各容器 veth pair。

```
      容器 test1                 容器 test2
        eth0                      eth0
          |  veth pair              |  veth pair
          |                          |
      [==== docker0 网桥 (虚拟二层交换机) ====]
                        |
                    宿主机 eth0  -->  外部网络
```

- 端口映射靠 iptables NAT：PREROUTING/DOCKER 链做 **DNAT**（8088 → 172.17.0.2:80）；POSTROUTING 链做 **MASQUERADE（SNAT）**：源地址 172.17.0.0/16 出网时换成宿主机 IP。
- 启动容器时 Docker 自动：创建 veth pair → 一端插 docker0、一端放入容器改名 eth0 → 分配容器 IP → 配默认路由。

```bash
iptables -t nat -nvL DOCKER
iptables -t nat -nvL POSTROUTING
```

```
外部用户                宿主机                     容器
访问 :8088  ──>  iptables DNAT  ──>  docker0 网桥  ──>  172.17.0.2:80
             8088 -> 172.17.0.2:80    按 MAC 转发
```

小结: 

- 网桥 docker0/CNI 网桥，iptables 实现端口映射、SNAT/DNAT 转发；
- 需开启 ip_forward、br_netfilter 网桥转发内核参数（K8s 安装前必做）：

```bash
# 1. 先加载 br_netfilter 模块（必须先做，否则第 2 步的 sysctl 参数根本不存在，会报 cannot stat）
modprobe br_netfilter
echo br_netfilter > /etc/modules-load.d/k8s.conf   # 开机自动加载

# 2. 写入内核参数
cat > /etc/sysctl.d/k8s.conf <<EOF
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF
sysctl --system        # 立即生效，不用重启

# 3. 验证
lsmod | grep br_netfilter
sysctl net.ipv4.ip_forward net.bridge.bridge-nf-call-iptables
```

两个参数分别是干什么的：
- `ip_forward=1`：允许内核在不同网卡 / 网桥之间转发 IP 包。**不开** → 容器（如 172.17.0.0/16）出不了宿主机，访问不了外网、跨节点也不通。
- `br_netfilter` + `bridge-nf-call-iptables=1`：让**经过网桥（二层）的流量也交给 iptables（三层）规则处理**。**不开** → K8s Service 的 iptables/IPVS 规则对 Pod 之间走网桥的流量失效，Service 访问不通，kubeadm 也会在 preflight 阶段直接报错。





**host 模式**：共享宿主机网络，无独立网络空间。

**container 模式**：与指定容器共享 Network Namespace（仅网络共享，经 lo 互通），K8s Pod 即此思路。**none 模式**：仅建网络空间、不配网卡/路由。

> 💡 **面试重点：** bridge 模式靠 docker0 网桥 + veth pair 实现容器互通，靠 iptables DNAT/SNAT 实现端口映射与出网；必须开启宿主机 `net.ipv4.ip_forward=1`。



注意事项:

1. bridge 模式必须开启内核 IP 转发、加载`br_netfilter`模块
2. 频繁启停容器需排查残留 veth 网卡，避免占用内核资源
3. 容器内网 IP 仅同网段容器、宿主机可访问，外网不能直接路由
4. 推荐自定义网桥，规避默认网段冲突，实现业务网络隔离

```bash
1. bridge（默认，可不加--net）
# 默认docker0网桥
docker run -d --name test nginx
# 显式指定bridge
docker run -d --net bridge --name test nginx

2. host 宿主机网络
docker run -d --net host --name test nginx

3. none 无网络
docker run -d --net none --name test nginx

4. container 复用其他容器网络
docker run -d --net container:已存在容器名/ID --name test nginx

二、生产自定义网桥常用套路命令
1. 创建自定义网桥（指定网段、网关）
docker network create \
--subnet=172.20.0.0/16 \
--gateway=172.20.0.1 \
my-net

2. 容器启动直接加入自定义网络
docker run -d --net my-net --name nginx nginx
3. 已有运行容器追加加入自定义网络
docker network connect my-net 容器名
4. 容器从网络中移除
docker network disconnect my-net 容器名
5. 查看网络详情
docker network inspect my-net
6. 删除闲置自定义网络
docker network rm my-net



```



### 11. containerd 与 CRI/OCI

- **OCI**：开放容器标准（镜像规范 + 运行时规范），runC 是参考实现。
- **CRI**：K8s 容器运行时接口，让 Kubelet 像插件一样对接运行时。

```
Kubernetes
    |  CRI
    v
  Kubelet --OCI--> 容器运行时(containerd/runC)
                        | OCI 规范
                        v
              镜像规范 + 运行时规范
```

弃用 dockershim：

```
旧: Kubelet --CRI--> Dockershim --> Docker Daemon --> containerd --> runC
新: Kubelet --CRI------------------------------> containerd --> runC
```

### 12. 实用技巧

```bash
## 清理所有退出的容器
docker rm  $(docker ps -aq)
## 调试启动失败：起临时容器手动跑入口命令
docker run --rm -ti <image_id> sh
```

### 13. 一句话小结

Docker = 轻量虚拟化（CS 架构）+ 镜像/容器/仓库三要素 + Namespace 隔离 + Cgroup 限制 + UnionFS 分层 + bridge 网络（docker0 + iptables NAT）；构建用 Dockerfile（多阶段瘦身），编排时代已由 containerd 接棒。



### nsenter  全称 namespace enter

`docker exec / kubectl exec` 依赖容器内部必须有 `bash/sh`、`ip`、`ifconfig` 等工具；

而 **nsenter 是从宿主机直接进入容器的隔离环境**，可以**直接使用宿主机的所有命令**，哪怕容器是极简镜像、没有任何网络工具也能调试网络、进程、文件系统。

```bash
# 属于 util-linux 系统工具包 CentOS 安装（自带，一般不用装）
yum install -y util-linux

二、Docker 容器标准用法
1. 先拿到容器在宿主机的 PID
# 容器名/容器ID替换成你的
PID=$(docker inspect --format '{{.State.Pid}}' 容器名)
2. 完整进入容器所有命名空间（拿到交互式 shell）
nsenter -t $PID -m -u -i -n -p /bin/bash

参数说明：
-t：指定目标进程 PID（必选）
-m：挂载命名空间（看到容器文件系统）
-u：主机名命名空间
-i：进程间通信
-n：网络命名空间（你用来查 ip 最常用）
-p：进程命名空间

极简写法（新版系统）
nsenter -t $PID -a bash
# -a 等价上面所有命名空间参数


不用进完整 shell，直接在容器网络环境执行宿主机的 ip/ss/curl：
# 只进入网络命名空间查看网卡
nsenter -t $PID -n ip addr
# 查看端口监听
nsenter -t $PID -n ss -tunlp
# 测试容器内部网络连通性
nsenter -t $PID -n curl 127.0.0.1:8080


K8s Pod 使用 nsenter 步骤
先登录 Pod 所在的宿主机节点
获取容器 PID：
# 拿到容器ID
crictl ps | grep pod名
# 拿PID
crictl inspect 容器ID | grep pid
再用 nsenter -t PID -n ip addr 调试网络


# 和 kubectl exec /docker exec 区别
exec：在容器内部新建进程，只能用容器里预装的命令；容器没有 shell 就进不去
nsenter：加入已有容器进程的隔离环境，复用宿主机所有命令，适合极简容器、容器卡死无法 exec 的紧急调试场景



```





---

## 二、Kubernetes 安装部署

### 2.1 环境准备与架构

生产级 K8s 由**控制平面（Master）**与**工作节点（Node）**组成。单 Master 存在单点故障，生产建议多 Master + 负载均衡。

```
        +-------------------+
        |   LoadBalancer    |
        +---------+---------+
                  |
   +--------------+--------------+
   |              |              |
+--+---+      +---+--+      +----+--+
|Master|      |Master|      |Master |
+------+      +------+      +-------+
   |              |              |
   +--------------+--------------+
                  |
   +--------------+--------------+
   |              |              |
+--+---+      +---+--+      +----+--+
| Node |      | Node |      | Node  |
+------+      +------+      +-------+
```

> 💡 **面试重点：** Master 承载 API Server、Scheduler、Controller Manager、etcd；Node 运行 kubelet、kube-proxy 与容器运行时。etcd 是集群唯一一致的数据存储。

最小化机器规划：

| 主机名     | 节点ip    | 角色   | 部署组件                                                     |
| ---------- | --------- | ------ | ------------------------------------------------------------ |
| k8s-master | 10.0.0.80 | master | etcd, kube-apiserver, kube-controller-manager, kubectl, kubeadm, kubelet, kube-proxy, flannel |
| k8s-slave1 | 10.0.0.81 | slave  | kubectl, kubelet, kube-proxy, flannel                        |
| k8s-slave2 | 10.0.0.82 | slave  | kubectl, kubelet, kube-proxy, flannel                        |

所有节点通用前置（逐字保留）：

```bash
systemctl stop firewalld
systemctl disable firewalld
sed -i 's/enforcing/disabled/' /etc/selinux/config
setenforce 0
swapoff -a
sed -ri 's/.*swap.*/#&/' /etc/fstab
hostnamectl set-hostname <hostname>
cat >> /etc/hosts << EOF
192.168.10.10 k8s-master
192.168.10.11 k8s-node1
192.168.10.12 k8s-node2
EOF
cat > /etc/sysctl.d/k8s.conf << EOF
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF
sysctl --system
```

> 💡 **面试重点：** 必须关闭 swap，否则 kubelet 默认无法启动。`net.bridge.bridge-nf-call-iptables=1` 保证桥接流量经 iptables 处理，是 Service 网络正常的必要条件。

### 2.2 安装容器运行时（containerd）

K8s 自 1.24 起移除 dockershim，推荐直接使用 containerd。

```bash
cat > /etc/yum.repos.d/docker-ce.repo << 'EOF'
[docker-ce-stable]
name=Docker CE Stable - $basearch
baseurl=https://mirrors.aliyun.com/docker-ce/linux/centos/7/$basearch/stable
enabled=1
gpgcheck=0
EOF
yum install -y containerd.io
mkdir -p /etc/containerd
containerd config default > /etc/containerd/config.toml
```

```toml
SystemdCgroup = true
sandbox_image = "registry.aliyuncs.com/google_containers/pause:3.9"
```

```bash
systemctl enable containerd
systemctl start containerd
```

> 💡 **面试重点：** containerd 的 `SystemdCgroup` 必须与 kubelet 的 `--cgroup-driver=systemd` 一致，否则节点 NotReady。

### 2.3 安装 kubeadm / kubelet / kubectl

```bash
cat > /etc/yum.repos.d/kubernetes.repo << 'EOF'
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=0
repo_gpgcheck=0
EOF
yum install -y kubelet-1.28.0 kubeadm-1.28.0 kubectl-1.28.0
systemctl enable kubelet
```

> 💡 **面试重点：** kubeadm 是“引导工具”（只负责初始化/加入），kubelet 是常驻的“节点管家”（真正干活），kubectl 是命令行客户端。

### 2.4 初始化 Master 节点

```bash
kubeadm init \
  --apiserver-advertise-address=192.168.10.10 \
  --image-repository registry.aliyuncs.com/google_containers \
  --kubernetes-version v1.28.0 \
  --service-cidr=10.96.0.0/12 \
  --pod-network-cidr=10.244.0.0/16
```

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
kubeadm join 192.168.10.10:6443 --token xxxx.xxxxxxxxxxxxxxxx \
  --discovery-token-ca-cert-hash sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> 💡 **面试重点：** `--pod-network-cidr` 必须与后续 CNI 插件（如 Flannel 默认 10.244.0.0/16）网段一致，否则 Pod 无法跨节点通信。`kubeadm init` 失败可用 `kubeadm reset` 清理后重试。

初始化流程：

```
kubeadm init
     |-- 检查前置条件 (swap/端口/镜像)
     |-- 生成证书与 kubeconfig
     |-- 启动静态 Pod(APIServer/ControllerManager/Scheduler/etcd)
     |-- 生成 join token
     |-- 输出 kubectl 配置 & join 命令
```

### 2.5 安装 CNI 网络插件（Flannel）

```bash
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
```

> 💡 **面试重点：** CNI 负责给 Pod 分配 IP 并实现跨节点通信。没有 CNI，节点永远 NotReady。常见选型：Flannel（简单）、Calico（网络策略强）、Cilium（eBPF）。

### 2.6 工作节点加入集群

```bash
kubeadm join 192.168.10.10:6443 --token xxxx.xxxxxxxxxxxxxxxx \
  --discovery-token-ca-cert-hash sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
kubectl get nodes
```

> 💡 **面试重点：** token 默认 24 小时过期；过期后在 Master 执行 `kubeadm token create --print-join-command` 重新生成。

### 2.7 集群访问架构

```
        kubectl / 其他客户端
                |
                v
        +------------------+
        |  kube-apiserver  |  (6443)
        +------------------+
           |     |     |
     +-----+  +--+--+  +-----+
     v        v     v        v
  scheduler  controller  etcd  kubelet(各节点)
                  |             |
              调度/控制      容器运行时(CRI)
```

### 2.8 部署测试应用（Nginx）

```bash
kubectl create deployment nginx --image=nginx:1.14-alpine
kubectl expose deployment nginx --port=80 --type=NodePort
kubectl get pods,svc
```

### 2.9 常见问题排查

```bash
kubectl describe node <node-name>
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubeadm reset -f
rm -rf /etc/cni /var/lib/kubelet /var/lib/etcd
```

> 💡 **面试重点：** 节点 `NotReady` 先查 CNI Pod 是否 Running，再看 `journalctl -u kubelet -f`；`kubeadm reset` 仅用于测试/排错环境。

### 2.10 集群自恢复与运维

```
故障场景         处理动作
-----------    -------------------------
Worker 宕机  ->  controller 检测 -> 调度 Pod 到健康节点
Master 宕机 ->  需多 Master(HA)避免单点
```

```bash
kubectl cluster-info
kubectl get componentstatuses
kubectl drain <node> --ignore-daemonsets
kubectl uncordon <node>
```



### 操作记录

安装前准备 + docker安装

```bash
# 在master节点
hostnamectl set-hostname k8s-master #设置master节点的hostname
# 在slave-1节点
hostnamectl set-hostname k8s-slave1 #设置slave1节点的hostname
# 在slave-2节点
hostnamectl set-hostname k8s-slave2 #设置slave2节点的hostname

cat >>/etc/hosts<<EOF
10.0.0.80 k8s-master
10.0.0.81 k8s-slave1
10.0.0.82 k8s-slave2
EOF

# 关闭swap
swapoff -a 
# 防止开机自动挂载 swap 分区
sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
#或者
#sed -ri '/ swap / s/(.*)/#\1/g' /etc/fstab


关闭selinux和防火墙
sed -ri 's#(SELINUX=).*#\1disabled#' /etc/selinux/config
setenforce 0
systemctl disable firewalld && systemctl stop firewalld

# 默认放行所有转发流量
iptables -P FORWARD ACCEPT

修改内核参数
cat <<EOF >  /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
# 让网桥转发的 IPv4 流量经过 iptables 防火墙规则，实现 NAT、端口映射、网络策略管控。
net.bridge.bridge-nf-call-iptables = 1
# 开启 IPv4 数据包跨网卡转发，容器访问外网、宿主机端口映射必备。
net.ipv4.ip_forward=1
# 调整进程最大内存映射区域数
vm.max_map_count=262144
EOF
modprobe br_netfilter
sysctl -p /etc/sysctl.d/k8s.conf


#配置yum源
rm -rf /etc/yum.repos.d/*
curl -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-7.repo
curl -o /etc/yum.repos.d/Centos-7.repo http://mirrors.aliyun.com/repo/Centos-7.repo
# curl -o /etc/yum.repos.d/docker-ce.repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=http://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg
        http://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF
yum clean all && yum makecache

#所有节点安装docker
#docker 安装
# https://mirrors.huaweicloud.com/mirrorDetail/5ea14d84b58d16ef329c5c13?mirrorName=docker-ce&catalog=docker
sudo yum remove docker docker-common docker-selinux docker-engine
sudo yum install -y yum-utils device-mapper-persistent-data lvm2
wget -O /etc/yum.repos.d/docker-ce.repo https://mirrors.huaweicloud.com/docker-ce/linux/centos/docker-ce.repo
sudo sed -i 's+download.docker.com+mirrors.huaweicloud.com/docker-ce+' /etc/yum.repos.d/docker-ce.repo
sudo yum makecache fast
sudo yum -y install docker-ce


## 配置docker加速和非安全的镜像仓库，需要根据个人的实际环境修改
mkdir -p /etc/docker
cat <<EOF > /etc/docker/daemon.json
{
    "registry-mirrors": [ "https://4c0c57d8b79a402d811834c1be74f7ae.mirror.swr.myhuaweicloud.com" ],
    "insecure-registries": ["10.0.0.80:5000"]
}
EOF
## 启动docker
systemctl enable docker && systemctl start docker



```

初始化集群

时间同步(所有节点都安装)

```bash
# 1. 检查并安装 chrony（最小化安装默认已装）
rpm -q chrony || yum install -y chrony 

# 2. 配置阿里云 NTP 服务器（国内首选，稳定低延迟）
cp /etc/chrony.conf /etc/chrony.conf.bak  # 备份原配置
# 写入新配置
cat > /etc/chrony.conf << EOF
# 使用阿里云公共NTP服务器
server ntp1.aliyun.com iburst
server ntp2.aliyun.com iburst
server ntp3.aliyun.com iburst
# 允许本机查询时间（可选）
allow 127.0.0.1
# 同步硬件时钟
rtcsync
# 不使用本地时钟兜底（外网可用时建议开启）
# local stratum 10
EOF

# 启用并立即启动
systemctl enable chronyd --now 
# 确认状态 active(running) 
systemctl status chronyd

 # 设置为上海时区
timedatectl set-timezone Asia/Shanghai
 # 验证时区与同步状态 
timedatectl status                   
# 1. 查看时间源状态（^* 表示当前活跃源）
chronyc sources -v 
# 2. 查看同步精度（offset 应 < 10ms，MGR 要求 < 50ms）
chronyc tracking 
# 3. 强制立即同步（仅首次部署时可选）
chronyc makestep 


```



```


#所有节点执行
yum install -y kubelet-1.24.4 kubeadm-1.24.4 kubectl-1.24.4 --disableexcludes=kubernetes
## 查看kubeadm 版本
kubeadm version
## 设置kubelet开机启动
systemctl enable kubelet --now


# 导出默认配置，config.toml这个文件默认是不存在的
# 将 sandbox_image 镜像源设置为阿里云google_containers镜像源
containerd config default > /etc/containerd/config.toml
grep sandbox_image  /etc/containerd/config.toml

sed -i "s#k8s.gcr.io/pause#registry.aliyuncs.com/google_containers/pause#g"       /etc/containerd/config.toml
sed -i "s#registry.k8s.io/pause#registry.aliyuncs.com/google_containers/pause#g"       /etc/containerd/config.toml

#配置镜像加速
sed -i '147s#\"\"#\"/etc/containerd/certs.d\"#g' /etc/containerd/config.toml
# 创建对应的目录
mkdir -p /etc/containerd/certs.d/docker.io
# 配置加速
cat >/etc/containerd/certs.d/docker.io/hosts.toml <<EOF
server = "https://docker.io"
[host."https://4c0c57d8b79a402d811834c1be74f7ae.mirror.swr.myhuaweicloud.com"]
  capabilities = ["pull","resolve"]
[host."https://docker.mirrors.ustc.edu.cn"]
  capabilities = ["pull","resolve"]
[host."https://registry-1.docker.io"]
  capabilities = ["pull","resolve","push"]
EOF


# 配置containerd cgroup 驱动程序systemd
sed -i 's#SystemdCgroup = false#SystemdCgroup = true#g' /etc/containerd/config.toml



# 配置非安全的私有镜像仓库：
# 此处目录必须和个人环境中实际的仓库地址保持一致
mkdir -p /etc/containerd/certs.d/10.0.0.80:5000
cat >/etc/containerd/certs.d/10.0.0.80:5000/hosts.toml <<EOF
server = "http://10.0.0.80:5000"
[host."http://10.0.0.80:5000"]
  capabilities = ["pull", "resolve", "push"]
  skip_verify = true
EOF

systemctl restart containerd


# 操作节点： 只在master节点（k8s-master）执行
kubeadm config print init-defaults > kubeadm.yaml
sed -ri 's#(advertiseAddress: ).*#\110.0.0.80#' kubeadm.yaml
sed -ri 's#(name: ).*#\1k8s-master#' kubeadm.yaml
sed -ri 's#(imageRepository: ).*#\1registry.aliyuncs.com/google_containers#' kubeadm.yaml
sed -ri 's#(kubernetesVersion: ).*#\11.24.4#' kubeadm.yaml
#sed -i '34a\ \ podSubnet: 10.244.0.0/16' kubeadm.yaml  #指定34行挤下一行添加
sed -i '/dnsDomain:/a\ \ podSubnet: 10.244.0.0/16' kubeadm.yaml

  # 查看需要使用的镜像列表,若无问题，将得到如下列表
$ kubeadm config images list --config kubeadm.yaml
registry.aliyuncs.com/google_containers/kube-apiserver:v1.24.4
registry.aliyuncs.com/google_containers/kube-controller-manager:v1.24.4
registry.aliyuncs.com/google_containers/kube-scheduler:v1.24.4
registry.aliyuncs.com/google_containers/kube-proxy:v1.24.4
registry.aliyuncs.com/google_containers/pause:3.7
registry.aliyuncs.com/google_containers/etcd:3.5.3-0
registry.aliyuncs.com/google_containers/coredns:v1.8.6
 # 提前下载镜像到本地
$ kubeadm config images pull --config kubeadm.yaml

# 初始化master节点
kubeadm init --config kubeadm.yaml
------------- 成功提示
kubeadm join 10.0.0.80:6443 --token abcdef.0123456789abcdef \
        --discovery-token-ca-cert-hash sha256:d3cc8c1f6666842101f79964ca5580291a41d54ac13d8a5862e0f84572a9b08a
----------------
# 执行集群重置清理残留  #初始化失败 再次执行初始化之前做的
# kubeadm reset -f
# 手动删除残留目录（兜底清理）
# rm -rf /etc/kubernetes /var/lib/etcd

#接下来按照上述提示信息操作，配置kubectl客户端的认证
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config



[root@k8s-master ~]# kubeadm token create --print-join-command
kubeadm join 10.0.0.80:6443 --token srw121.zmapgf66alkiurel --discovery-token-ca-cert-hash sha256:d3cc8c1f6666842101f79964ca5580291a41d54ac13d8a5862e0f84572a9b08a


# 添加slave节点到集群中  #再slave节点运行
kubeadm join 10.0.0.80:6443 --token srw121.zmapgf66alkiurel --discovery-token-ca-cert-hash sha256:d3cc8c1f6666842101f79964ca5580291a41d54ac13d8a5862e0f84572a9b08a



# master 安装网络插件
wget https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
# wget https://gitee.com/chengkanghua/script/raw/master/k8s/kube-flannel.yml

#命令修改  修改网卡名eth0
sed -i '/kube-subnet-mgr/a\ \ \ \ \ \ \ \ - --iface=eth0' kube-flannel.yml

# 执行flannel安装
kubectl apply -f kube-flannel.yml
kubectl -n kube-flannel get po -owide

# 默认部署成功后，master节点无法调度业务pod，如需设置master节点也可以参与pod的调度，需执行：
#kubectl taint node k8s-master node-role.kubernetes.io/master:NoSchedule-
#kubectl taint node k8s-master node-role.kubernetes.io/control-plane:NoSchedule-

# 设置kubectl自动补全
$ yum install bash-completion -y
source /usr/share/bash-completion/bash_completion
source <(kubectl completion bash)
echo "source <(kubectl completion bash)" >> ~/.bashrc

# 使用kubeadm安装的集群，证书默认有效期为1年，可以通过如下方式修改为10年。
cd /etc/kubernetes/pki

# 查看当前证书有效期
for i in $(ls *.crt); do echo "===== $i ====="; openssl x509 -in $i -text -noout | grep -A 3 'Validity' ; done

mkdir backup_key; cp -rp ./* backup_key/
#git clone https://github.com/yuyicai/update-kube-cert.git
#cd update-kube-cert/ 
wget https://gitee.com/chengkanghua/script/raw/master/k8s/update-kubeadm-cert.sh
bash update-kubeadm-cert.sh all
#若无法clone项目，可以手动在浏览器中打开后，复制update-kubeadm-cert.sh 脚本内容到机器中执行

#观察集群节点是否全部Ready
kubectl get nodes  


# 测试nginx 服务
kubectl run  test-nginx --image=nginx:alpine

kubectl get po -o wide
curl `kubectl get po -o wide |awk 'NR==2{print $6}'`





```



containerd客户端介绍

```
由于新版本的k8s直接采用`containerd`作为容器运行时，因此，后续创建的服务，通过`docker`的命令无法查询，因此，如果有需要对节点中的容器进行操作的需求，需要用`containerd`的命令行工具来替换，
目前总共有三种，包含：
- ctr
- crictl
- nerctl

ctr为最基础的containerd的操作命令行工具，安装containerd时已默认安装，因此无需再单独安装。
ctr的可操作的命令很少，且很不人性化，因此极力不推荐使用
Containerd 也有 namespaces 的概念，对于上层编排系统的支持，ctr 客户端 主要区分了 3 个命名空间分别是k8s.io、moby和default

# 查看containerd的命名空间
ctr ns ls;
# 查看containerd启动的容器列表
ctr -n k8s.io container ls
# 查看镜像列表
ctr -n k8s.io image ls
# 导入镜像
ctr -n=k8s.io image import dashboard.tar
# 从私有仓库拉取镜像，前提是/etc/containerd/certs.d下已经配置过该私有仓库的非安全认证
ctr images pull --user admin:admin  --hosts-dir "/etc/containerd/certs.d"  10.0.0.80:5000/eladmin/eladmin-api:v1-rc1
# ctr命令无法查看容器的日志，也无法执行exec等操作


crictl 是遵循 CRI 接口规范的一个命令行工具，通常用它来检查和管理kubelet节点上的容器运行时和镜像。
主机安装了 k8s 后，命令行会有 crictl 命令，无需单独安装。
crictl 命令默认使用k8s.io 这个名称空间，因此无需单独指定，使用前，需要先加一下配置文件
cat > /etc/crictl.yaml <<EOF
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
debug: false
EOF

# 查看容器列表
crictl ps
# 查看镜像列表
crictl images 
# 删除镜像
crictl rmi 10.0.0.80:5000/eladmin/eladmin-api:v1-rc1
# 拉取镜像， 若拉取私有镜像，需要修改containerd配置添加认证信息，比较麻烦且不安全
crictl pull nginx:alpine
# 执行exec操作
crictl ps 
# 注意只能使用containerid
crictl exec -ti d23fe516d2eeb bash
# 查看容器日志
crictl logs -f d23fe516d2eeb
# 清理镜像
crictl rmi --prune



推荐使用 nerdctl，使用效果与 docker 命令的语法基本一致 , 
官网https://github.com/containerd/nerdctl

#安装
# 下载精简版安装包，精简版的包无法使用nerdctl进行构建镜像
wget https://github.com/containerd/nerdctl/releases/download/v0.23.0/nerdctl-0.23.0-linux-amd64.tar.gz

# 解压后，将nerdctl 命令拷贝至$PATH下即可
cp nerdctl /usr/bin/
---------------------浏览器下载
https://gitee.com/chengkanghua/script/raw/master/k8s/nerdctl-0.23.0-linux-amd64.tar.gz
tar xvf nerdctl-0.23.0-linux-amd64.tar.gz
mv nerdctl /usr/bin/

# 常用操作
nerdctl ns ls
# 查看容器列表
nerdctl -n k8s.io ps -a
# 执行exec
nerdctl -n k8s.io exec -ti e2cd02190005 sh
#删除容器
nerdctl -n k8s.io rm -f de6837094ca7

# 登录镜像仓库
nerdctl login 10.0.0.80:5000
# 拉取镜像,如果是想拉取了让k8s使用，一定加上-n k8s.io,否则会拉取到default空间中， k8s默认只使用k8s.io
nerdctl -n k8s.io pull 10.0.0.80:5000/eladmin/eladmin-api:v1
#查看镜像列表
nerdctl -n k8s.io images
# 按镜像名删除
nerdctl -n k8s.io rmi 10.0.0.80:5000/eladmin/eladmin-api:v1
# 按镜像ID删除（先通过上面images拿到IMAGE ID）
nerdctl -n k8s.io rmi -f 镜像ID
# 清理所有未被容器使用的镜像
nerdctl -n k8s.io image prune -a -f
# 批量删除<none>悬空镜像
nerdctl -n k8s.io images --filter "dangling=true" -q | xargs nerdctl -n k8s.io rmi -f

# 启动容器
nerdctl -n k8s.io run -d --name test nginx:alpine
# exec
nerdctl -n k8s.io  exec -ti test sh
# 查看日志, 注意，nerdctl 只能查看使用nerdctl命令创建从容器的日志，k8s中kubelet创建的产生的容器无法查看
nerdctl -n k8s.io logs -f test
# 构建，但是需要额外安装buildkit的包
nerdctl build . -t xxxx:tag -f Dockerfile


使用小经验
用了k8s后，对于业务应用的基本操作，90%以上都可以通过kubectl命令行完成
对于镜像的构建，仍然推荐使用docker build 来完成，推送到镜像仓库后，containerd可以直接使用
对于查看containerd中容器的日志，使用 crictl logs完成，因为ctr、nerdctl均不支持
对于其他常规的containerd容器操作，建议使用nerdctl完成
更多命令可以参考下文：
https://www.modb.pro/db/485911
https://github.com/containerd/nerdctl#container-management




```







---

## 三、Kubernetes 落地实践之旅

### 3.1 为什么需要 Kubernetes

容器解决“环境不一致”，但单机跑容器遇扩缩容、故障自愈、服务发现仍需人工。K8s 把运维经验变成平台能力。

```
单机容器                Kubernetes 集群
┌─────────┐            ┌──────────────────────────┐
│  容器A   │   ——>     │  Master(调度/控制)        │
│  容器B   │            │  ┌────┐ ┌────┐ ┌────┐    │
│ (人工管) │            │  │Node│ │Node│ │Node│    │
└─────────┘            │  │ Pods    Pods    Pods │ │
                       └──────────────────────────┘
```

> 💡 **面试重点：** k8s 解决的核心不是“跑容器”，而是容器的**编排**（调度 + 自愈 + 扩缩 + 服务发现）。

 **k8s核心价值**

通过集群级声明式容器编排，自动实现自愈、服务发现、弹性伸缩、滚动发布、智能调度、统一配置管理，大幅提升业务可用性与运维效率。

### 3.2 官方标准架构（控制平面 + 工作节点）

```
┌──────────────────────────────────────────────────────────────────┐
│                      控制平面 Control Plane                        │
│  ┌──────────────┐   ┌──────────┐   ┌───────────┐  ┌────────────┐  │
│  │ kube-apiserver│   │  etcd    │   │ scheduler  │  │ controller │  │
│  │ (集群唯一入口) │◀──│(状态存储)│   │ (Pod 调度) │  │  -manager  │  │
│  └──────┬───────┘   └────▲─────┘   └─────┬─────┘  └─────┬─────┘  │
│         │  唯一读写 etcd  │             │               │         │
│         └────────────────┴─────────────┴───────────────┘         │
└─────────────────────────────────┬────────────────────────────────┘
                                   │ kubelet 心跳 / 指令
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
   │   Worker Node   │    │   Worker Node   │    │   Worker Node   │
   │ kubelet         │    │ kubelet         │    │ kubelet         │
   │ kube-proxy      │    │ kube-proxy      │    │ kube-proxy      │
   │ 容器运行时      │    │ 容器运行时      │    │ 容器运行时      │
   │  ┌──Pod──┐      │    │  ┌──Pod──┐      │    │  ┌──Pod──┐      │
   │  │container│     │    │  │container│     │    │  │container│     │
   │  └───────┘      │    │  └───────┘      │    │  └───────┘      │
   └─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **API Server**：唯一入口。**etcd**：唯一真实数据源。**Scheduler**：调度 Pod。**Controller Manager**：维持期望状态。
- **Node**：**kubelet** 管本机 Pod；**kube-proxy** 实现 Service 转发。

> 一张图记住：控制平面（大脑）管决策、存状态；工作节点（手脚）跑 Pod。组件间只通过 apiserver 通信，etcd 是唯一数据源。

> 💡 **面试重点：** etcd 是 k8s 的“唯一事实来源”；API Server 是所有组件通信中枢。



#### 1. 控制平面组件（集群大脑，全局决策）

控制平面负责集群管控、调度、状态存储，不运行业务容器，生产环境建议多节点高可用部署。

| 组件                         | 官方定义与核心作用                                           |
| :--------------------------- | :----------------------------------------------------------- |
| **kube-apiserver**           | 集群唯一入口，暴露 RESTful API；所有组件的交互中枢，负责认证、授权、准入校验；是唯一直接读写 etcd 的组件，可水平扩容 |
| **etcd**                     | 一致性、高可用的键值数据库；集群所有资源状态、配置、元数据的唯一持久化存储；生产必须做数据备份 |
| **kube-scheduler**           | 监听未绑定节点的新建 Pod，通过「预选过滤 + 优选打分」算法，为 Pod 选择最合适的工作节点 |
| **kube-controller-manager**  | 运行各类控制器进程，核心机制是**调和循环**：持续监听资源变化，驱动「实际状态」向「期望状态」收敛；内置节点控制器、副本控制器、端点控制器、命名空间控制器等 |
| **cloud-controller-manager** | 可选组件，对接公有云 API；管理云厂商负载均衡、云盘存储、路由网络等资源，私有化部署可不用 |

#### 2. 工作节点组件（运行业务负载）

每个工作节点负责运行 Pod 并提供容器运行环境，受控于控制平面。

| 组件                   | 官方定义与核心作用                                           |
| :--------------------- | :----------------------------------------------------------- |
| **kubelet**            | 节点上的常驻代理，是控制平面与节点的通信桥梁；接收 apiserver 指令，管理本机 Pod 的全生命周期（创建、启停、健康检查、资源限制），确保 Pod 状态符合规约 |
| **kube-proxy**         | 节点网络代理；维护节点上的 iptables/ipvs 网络规则，实现 Service 负载均衡、集群内服务发现与流量转发 |
| **容器运行时**         | 遵循 CRI（容器运行时接口）标准，负责拉取镜像、创建 / 销毁容器；主流实现为 containerd，早期版本使用 Docker |
| **集群插件（Addons）** | 可选扩展能力，包括 CoreDNS（集群内部 DNS 解析）、Ingress Controller、监控日志组件等 |

------

### 二、官方标准工作流程（以创建 Deployment 为例）

K8s 核心设计是**声明式 API + 调和循环**：用户只提交期望状态，系统通过 List-Watch 机制持续监听，自动收敛到目标状态。

以「提交一个 3 副本 Nginx 的 Deployment」为例，完整执行链路：

1. **请求接入**：用户通过 `kubectl apply` 提交 Deployment 配置，请求经认证授权后到达 kube-apiserver
2. **状态持久化**：apiserver 校验资源合法性，将 Deployment 的期望状态写入 etcd
3. **控制器调和**：Deployment Controller 监听到资源变更，对比期望状态，创建对应 ReplicaSet 资源并写入 etcd；ReplicaSet Controller 继续创建 3 个未绑定节点的 Pod 资源
4. **Pod 调度**：kube-scheduler 监听到未调度的 Pod，执行预选 + 优选算法，为每个 Pod 分配目标节点，更新 Pod 的节点绑定信息写入 etcd
5. **Pod 启动**：目标节点的 kubelet 监听到分配给自己的 Pod，调用本地容器运行时拉取镜像、创建并启动容器
6. **状态上报**：kubelet 持续上报 Pod 健康状态到 apiserver，同步存入 etcd
7. **服务网络生效**：Endpoints 控制器监听到 Pod 就绪，更新对应 Service 的后端端点列表；各节点 kube-proxy 同步更新网络规则，完成服务负载均衡配置

------

### 三、核心设计原则（官方核心思想）

1. **声明式 API**：用户只定义最终期望状态，不关心执行步骤，系统自动完成编排
2. **List-Watch 机制**：所有组件通过监听 apiserver 资源变化触发动作，无轮询开销，实时响应
3. **不可变基础设施**：容器镜像不可变，更新通过重建 Pod 实现，保证环境一致性
4. **自愈能力**：节点故障、Pod 异常时，控制器自动重建 / 迁移 Pod，维持期望副本数



### 什么是分布式？

把**原本跑在一台机器上的整套系统**，拆分多个组件，部署在**多台独立服务器**上协同工作，通过网络互相通信、分工协作、共同对外提供服务，任意单台机器故障不会导致整个系统瘫痪，这就是分布式。

与之对立的是**单体架构（集中式）**：所有组件只部署在一台服务器，机器宕机，整套服务直接不可用。

#### 二、结合 K8s 控制平面 + 工作节点，拆解分布式三层含义

##### 1. 组件分布式拆分（功能拆分，各司其职）

K8s 不再是一个单一程序，被拆成多个独立组件，各自负责不同工作：

**控制平面组件（Master 节点）**

- `etcd`：分布式键值数据库，存储集群所有元数据
- `kube-apiserver`：集群唯一入口、鉴权、数据网关
- `kube-controller-manager`：控制器，持续调谐期望状态
- `kube-scheduler`：调度器，把 Pod 调度到合适的 Worker 节点

**工作节点组件（Worker 节点）**

- `kubelet`：管理本机 Pod 生命周期
- `kube-proxy`：维护 Service 网络转发规则
- 容器运行时（containerd/cri-o）：真正跑容器

每个组件独立部署、独立演进、可以单独扩容升级，一个组件故障不会连带其他组件挂掉。

##### 2. 多节点集群部署（物理机器分布式，高可用核心）

1. 控制平面可以多主部署（3/5 个 Master 节点）

   **apiserver**无状态可水平扩容，多个 Master 同时对外提供服务；后端etcd天然分布式集群，采用 Raft 一致性算法，少数节点故障（比如 3 节点挂 1 台），集群数据不丢失、集群依然可用。

2. Worker 节点横向无限扩容

   业务不够就新增服务器加入集群，所有 Worker 统一受控制平面调度，实现算力分布式扩容，突破单台机器硬件上限。

> 传统单体架构只能靠升级单台机器 CPU、内存纵向扩容；分布式架构支持多机器横向扩容。

##### 3. 任务分布式调度执行（业务负载分布式）

1. 用户提交部署需求给`apiserver`，调度器把 Pod 打散调度到不同 Worker 节点；
2. 同一个应用的多个 Pod 副本分散在多台宿主机，某一台 Worker 宕机，该节点上的 Pod 会被控制器重新调度到其他健康节点，业务不会中断；
3. 集群把计算、存储、网络压力分摊到所有节点，避免单点服务器压力过载。

#### 三、分布式架构给 K8s 带来三大核心价值

1. 高可用

   多副本、多节点部署，单点硬件 / 组件故障不影响整体集群运行；

2. 可横向扩容

   Master 组件、Worker 节点均可水平扩展，支撑海量业务容器；

3. 容错 + 数据一致性

   依靠etcd分布式一致性协议保证集群所有节点数据统一，所有节点看到的集群资源状态完全一致。

#### 四、补充对比：单体 vs 分布式

1. 单体：所有 K8s 组件装在一台服务器，机器宕机 → 整个集群瘫痪；只能纵向升级硬件。
2. 分布式：多 Master + 多 Worker，单节点故障集群可用；支持横向加机器扩容，负载分散、容错能力强。

#### 五、延伸小考点

K8s 控制平面的分布式核心依赖：

1. `etcd`分布式存储（保证集群数据一致性、高可用）
2. `kube-apiserver`无状态设计（支持多实例水平部署做负载均衡）

### 理解集群资源

### 核心理解 🎯

**资源 = 使用 K8s 各种能力的载体**（想用什么能力，就创建对应类型的资源）。

所有可通过 `kubectl get` 查询的对象统称为**集群资源**：以 YAML 声明期望状态存入 etcd，控制器通过调谐循环让实际状态不断趋近期望状态。

> 🎯 **面试高频**：所有资源通用**五段结构** —— `apiVersion`（API 版本）、`kind`（资源类型）、`metadata`（名称 / 标签 / 命名空间）、`spec`（期望状态，用户写）、`status`（实际状态，系统填）。

### 五大类资源（必背）

#### 1. 工作负载类（部署业务）

1. **Pod**：集群最小调度单元，封装一组容器，生命周期短暂，重建 IP 变化。
2. **Deployment**：管理无状态应用，实现副本维持、滚动更新、回滚、故障自愈。
3. **StatefulSet**：管理有状态应用，提供稳定网络标识、有序部署销毁、持久存储。
4. **DaemonSet**：每个节点仅运行一个 Pod，用于日志、监控、网络插件等节点级组件。
5. **Job/CronJob**：一次性任务、定时任务。

#### 2. 网络服务类（流量访问）

1. **Service**：Pod 固定访问入口，提供 ClusterIP，实现负载均衡、集群内服务发现。
2. **Endpoint**：Service 后端绑定的 Pod IP + 端口列表。
3. **Ingress**：七层反向代理，基于域名、路径转发外部流量到多个 Service。

#### 3. 配置管理类（解耦配置与镜像）

1. **ConfigMap**：存放明文配置、环境变量、配置文件。
2. **Secret**：存放密码、证书等敏感数据，仅 Base64 编码，非加密。

#### 4. 存储资源类（数据持久化）

1. **PV**：管理员预先创建的持久存储卷。
2. **PVC**：业务存储申请，通过绑定 PV 实现数据持久挂载。
3. **StorageClass**：动态存储类，无需手动创建 PV，按需自动分配存储。

#### 5. 集群管控类（隔离、权限、资源限制）

1. **Namespace**：资源逻辑隔离，用来划分测试、生产等环境。
2. **Node**：集群节点，承载所有 Pod 运行，自带 CPU、内存硬件资源。
3. **ResourceQuota**：命名空间级别 CPU、内存、Pod 总数配额限制。
4. **LimitRange**：给命名空间内 Pod / 容器设置默认、最大最小资源限制。
5. **RBAC**：基于角色的权限控制，管理用户、服务账号对集群资源的操作权限。
6. **HPA**：水平 Pod 自动扩缩容控制器，根据监控指标自动调整Deployment、StatefulSet 等工作负载的 Pod 副本数量。

#### 三、加分总结

所有集群资源本质都是 API 对象，通过标签 Label 筛选资源，注解 Annotation 存储扩展描述；借助控制器实现声明式运维，不用关心具体操作步骤，只需要定义最终想要的集群状态。

### kubectl 高频常用命令

```bash
kubectl api-resources

kubectl get namespaces

kubectl是命令行工具, 用于与APIServer交互，内置了丰富的子命令，功能极其强大。 https://kubernetes.io/docs/reference/kubectl/overview/
$ kubectl -h
$ kubectl get -h
$ kubectl create -h
$ kubectl create namespace -h


一、集群信息
kubectl get nodes                  # 查看所有节点
kubectl get ns / namespaces        # 查看命名空间
kubectl describe node 节点名       # 节点详细信息
kubectl version                    # 客户端、服务端版本
kubectl cluster-info               # 集群信息
二、资源查看（最常用）
# 查看默认命名空间资源
kubectl get pods
kubectl get deploy
kubectl get svc

# 指定命名空间
kubectl get pods -n test
# 所有命名空间
kubectl get pods --all-namespaces / -A

# 查看详情、事件
kubectl describe pod pod名 -n ns名
# 查看标签
kubectl get pods --show-labels


# node节点添加标签
kubectl label node k8s-slave1 component=gitlab
# 删除掉标签
kubectl label node k8s-slave1 component-

# 按标签过滤
kubectl get pods -l app=nginx

三、资源创建、删除、更新
# 从yaml创建
kubectl apply -f xxx.yaml
# 批量创建目录下所有yaml
kubectl apply -f ./dir

# 删除资源
kubectl delete pod pod名 -n ns
kubectl delete -f xxx.yaml
kubectl delete ns test             # 删除命名空间（连带内部所有资源）

# 直接命令创建（临时测试）
kubectl create deploy nginx --image=nginx
# 扩缩容
kubectl scale deploy nginx --replicas=3
# 镜像升级
kubectl set image deploy nginx nginx=nginx:1.23
# 回滚
kubectl rollout undo deploy nginx
# 查看发布历史
kubectl rollout history deploy nginx

四、日志、进入容器、文件传输
# 实时查看日志
kubectl logs -f pod名 -n ns
# 查看之前崩溃日志
kubectl logs --previous pod名

# 进入容器
kubectl exec -it pod名 -n ns -- /bin/bash
# 多容器Pod指定容器进入
kubectl exec -it pod名 -c 容器名 -- sh

# 宿主机 ↔ 容器传文件
kubectl cp 宿主机路径 pod名:容器内路径 -n ns
kubectl cp pod名:容器路径 宿主机路径 -n ns

五、配置类资源操作
kubectl get cm
kubectl get secret
kubectl describe cm xxx
kubectl get configmap xxx -o yaml  # 导出yaml

六、存储、网络、Ingress
kubectl get pv
kubectl get pvc
kubectl get ingress

七、导出资源 yaml（备份 / 模板）
# 查看yaml格式
kubectl get deploy nginx -o yaml
# 导出保存
kubectl get deploy nginx -o yaml > deploy.yaml
# 快速生成yaml不创建资源
kubectl create deploy nginx --image=nginx --dry-run=client -o yaml > nginx.yaml

八、常用格式化输出
-o wide        # 更多列（节点、IP）
-o yaml
-o json

九、上下文 / 命名空间快捷设置
# 设置默认命名空间
kubectl config set-context --current --namespace=test
# 查看当前上下文
kubectl config get-contexts


```



### 核心组件

- ETCD：分布式高性能键值数据库,存储整个集群的所有元数据
- ApiServer: API服务器,集群资源访问控制入口,提供restAPI及安全访问控制
- Scheduler：调度器,负责把业务容器调度到最合适的Node节点
- Controller Manager：控制器管理,确保集群资源按照期望的方式运行
  - Replication Controller
  - Node controller
  - ResourceQuota Controller
  - Namespace Controller
  - ServiceAccount Controller
  - Token Controller
  - Service Controller
  - Endpoints Controller
- kubelet：运行在每个节点上的主要的“节点代理”，脏活累活
  - pod 管理：kubelet 定期从所监听的数据源获取节点上 pod/container 的期望状态（运行什么容器、运行的副本数量、网络或者存储如何配置等等），并调用对应的容器平台接口达到这个状态。
  - 容器健康检查：kubelet 创建了容器之后还要查看容器是否正常运行，如果容器运行出错，就要根据 pod 设置的重启策略进行处理.
  - 容器监控：kubelet 会监控所在节点的资源使用情况，并定时向 master 报告，资源使用数据都是通过 cAdvisor 获取的。知道整个集群所有节点的资源情况，对于 pod 的调度和正常运行至关重要
- kube-proxy：维护节点中的iptables或者ipvs规则
- kubectl: 命令行接口，用于对 Kubernetes 集群运行命令 https://kubernetes.io/zh/docs/reference/kubectl/



```
K8s架构+工作流程 3分钟面试背诵版
一、K8s架构（口述1分钟）
K8s整体采用控制平面 + 工作节点的主从分布式架构。
首先是控制平面，是整个集群的管控核心，主要包含四个核心组件：
第一，kube-apiserver，是集群唯一API入口，所有操作、所有组件都和它交互，负责认证授权、准入控制，也是唯一操作etcd的组件。
第二，etcd，是集群唯一数据库，存储所有资源的元数据和期望状态。
第三，kube-scheduler，负责监听未调度的Pod，通过预选、优选策略，把Pod调度到最优工作节点。
第四，kube-controller-manager，内置各类控制器，通过调谐循环，保证集群实际状态和用户期望状态一致，实现自愈能力。

然后是工作节点，负责运行业务Pod，核心组件有三个：
kubelet 是节点代理，负责管理本机Pod的全生命周期；
kube-proxy 维护节点网络规则，实现Service负载均衡和服务发现；
还有容器运行时，负责拉取镜像、运行容器。


二、工作流程（口述2分钟，以Deployment部署为例）
整体流程遵循 K8s 声明式API、List-Watch监听、控制器调谐 的核心机制。
第一步，我执行kubectl apply，请求经过认证授权后给到apiserver，apiserver校验后把资源信息持久化到etcd。
第二步，Deployment控制器监听到资源变化，自动创建ReplicaSet，ReplicaSet再根据配置的副本数，创建对应的Pod资源，写入etcd。
第三步，调度器监听到这批未绑定节点的Pod，经过过滤、打分，选择最合适的Worker节点，完成Pod节点绑定。
第四步，对应节点的kubelet监听到分配给自己的Pod，调用容器运行时，创建沙箱和业务容器，完成Pod启动。
第五步，kubelet实时上报Pod状态，更新到集群数据库。同时kube-proxy更新网络规则，实现Service访问和负载均衡。
最后如果Pod异常退出，控制器会自动重建Pod，始终维持用户定义的期望副本数，实现集群自愈。

三、收尾加分一句话（必说）
简言之，K8s无需定义操作步骤，仅需配置业务期望状态，集群可自动完成调度、部署、扩缩容和故障自愈。


```



**OCI：底层容器通用标准（管镜像、管内核怎么跑容器）**;统一容器标准**（所有容器都遵守）

**CRI：K8s 专属上层接口标准（管 K8s 怎么调用容器运行时）**; K8s 解耦接口**（让 K8s 不绑定 Docker）





### 3.3 核心对象概览

| 对象 | 作用 | 类比 |
|------|------|------|
| Pod | 最小部署单元，含 1~N 容器（共享网络/存储） | 豌豆荚 |
| Deployment | 管理 Pod 副本、滚动更新 | 副本管家 |
| Service | 稳定访问入口，负载均衡到后端 Pod | 固定电话总机 |
| ConfigMap | 配置外挂（不敏感） | 配置本 |
| Secret | 敏感配置（密码/token），base64 | 保险箱 |
| Namespace | 资源逻辑隔离 | 文件夹 |
| Volume | 持久化/共享存储 | 外接硬盘 |

> 💡 **面试重点：** Pod 是原子调度单位；一个 Pod 内多容器共享 `localhost` 网络与 Volume。Service 通过 selector 关联 Pod，IP 不变而 Pod 会重建。















### 3.4 第一个应用：Deployment 跑 Nginx

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deploy
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
```

```bash
kubectl apply -f nginx-deploy.yaml
kubectl get pods
kubectl get deploy
kubectl describe pod <pod-name>
kubectl logs <pod-name>
kubectl delete -f nginx-deploy.yaml
```

> 💡 **面试重点：** `kubectl apply` 是“声明式”——你描述期望状态，k8s 自己算差异并收敛，区别于 `kubectl create` 的命令式。

### 3.5 暴露服务：Service 三种类型

```
Client ──> Service(ClusterIP:80)
              │  selector: app=nginx
   ┌──────────┼──────────┐
   ▼          ▼          ▼
 Pod1        Pod2        Pod3   (Endpoint 动态维护)
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-svc
spec:
  type: ClusterIP
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

| 类型 | 访问范围 | 场景 |
|------|----------|------|
| ClusterIP | 仅集群内 | 内部服务调用 |
| NodePort | 任一节点 IP:端口 | 测试/裸机 |
| LoadBalancer | 云负载均衡公网 IP | 生产对外 |

> 💡 **面试重点：** Service 的 VIP 由 kube-proxy + iptables/IPVS 实现；Pod 重建后 IP 变，但 Service 名不变，调用方无感。

### 3.6 配置与敏感信息：ConfigMap / Secret

```bash
kubectl create configmap app-conf --from-file=app.properties
kubectl create secret generic db-secret \
  --from-literal=username=admin \
  --from-literal=password='S3cr3t!'
```

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0
    env:
    - name: DB_USER
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: username
    volumeMounts:
    - name: conf
      mountPath: /etc/app
  volumes:
  - name: conf
    configMap:
      name: app-conf
```

> 💡 **面试重点：** Secret 默认只是 base64 编码（非加密），生产应配合 KMS/加密 etcd；ConfigMap 变更后需重启或支持热加载的进程才生效。

### 3.7 持久化存储：Volume 与 PVC

```
Pod ──(PVC 请求)──> PersistentVolumeClaim
                        │ 绑定
                        ▼
                  PersistentVolume (NFS/云盘/本地)
```

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-1
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

```yaml
spec:
  containers:
  - name: app
    volumeMounts:
    - mountPath: "/data"
      name: data-vol
  volumes:
  - name: data-vol
    persistentVolumeClaim:
      claimName: pvc-1
```

> 💡 **面试重点：** PVC 是“用户对存储的请求”，PV 是“实际存储资源”；二者解耦，系统自动绑定。

### 3.8 探针：让 k8s 知道“活没活”

```
livenessProbe  ──失败──> 重启容器
readinessProbe ──失败──> 从 Service 摘流量(不重启)
startupProbe   ──失败──> 启动期保护(老慢应用)
```

```yaml
spec:
  containers:
  - name: app
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
```

> 💡 **面试重点：** liveness 决定“重启”，readiness 决定“接流量”；混淆二者是常见故障源。

### 3.9 扩缩容：HPA 自动伸缩

```bash
kubectl scale deploy nginx-deploy --replicas=5
```

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-deploy
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

> 💡 **面试重点：** HPA 基于“实际度量”调副本，依赖 metrics-server；扩的是 Pod 副本，不是 Node。

### 3.10 滚动更新与回滚

```bash
kubectl set image deploy/nginx-deploy nginx=nginx:1.26
kubectl rollout status deploy/nginx-deploy
kubectl rollout undo deploy/nginx-deploy
kubectl rollout history deploy/nginx-deploy
```

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

> 💡 **面试重点：** 滚动更新靠“新旧 Pod 并存 + 逐步切流量”实现零停机；回滚本质是把 ReplicaSet 切回旧版本，不是重新部署。

### 3.11 资源限制与 QoS

```yaml
spec:
  containers:
  - name: app
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "256Mi"
```

QoS 三档（决定驱逐优先级）：**Guaranteed**（requests=limits）> **Burstable** > **BestEffort**（啥都没设，最先被驱逐）。

> 💡 **面试重点：** `requests` 影响调度（节点剩余资源够才放得下），`limits` 影响运行时（内存超限直接 OOMKilled）；生产务必双设。

### 3.12 命名空间与资源配额

```bash
kubectl create namespace team-a
kubectl config set-context --current --namespace=team-a
```

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota-a
  namespace: team-a
spec:
  hard:
    pods: "10"
    requests.cpu: "4"
    requests.memory: 4Gi
```

> 💡 **面试重点：** Namespace 是逻辑隔离(非网络隔离)；配合 ResourceQuota/LimitRange 防止某团队“占满集群”。

### 3.13 排障套路

```bash
kubectl get pods -A
kubectl describe pod <pod>
kubectl logs <pod> [-c <容器>]
kubectl exec -it <pod> -- /bin/sh
kubectl get events --sort-by=.lastTimestamp
kubectl top pod/node
```

- **ImagePullBackOff**：镜像名错 / 私有仓未配 Secret。
- **CrashLoopBackOff**：容器启动即退出，看 `logs` + `describe`。
- **Pending**：资源不足或节点污点不匹配。
- **OOMKilled**：内存 limit 太小。

> 💡 **面试重点：** Pod 状态机 `Pending→Running→Succeeded/Failed`；CrashLoopBackOff 多半是应用启动报错而非 k8s 问题，先 `kubectl logs` 再看 Events。

### 3.14 进阶补充

**优先级与抢占（PriorityClass）**：

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
```

Pod 引用 `priorityClassName: high-priority`；资源紧张时高优先级可抢占低优先级 Pod。

**资源配额与限制范围（ResourceQuota / LimitRange）**：

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: limit-range
  namespace: dev
spec:
  limits:
  - default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    max:
      cpu: "1"
      memory: 1Gi
    min:
      cpu: 50m
      memory: 64Mi
    type: Container
```

> 💡 **面试重点：** `ResourceQuota` 限制命名空间总量；`LimitRange` 给未显式设置的容器补默认值并约束上下限。

**StatefulSet 有状态应用**：稳定网络标识 + 稳定存储，Pod 名有序（web-0, web-1…）。

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "web"
  replicas: 3
  selector:
    matchLabels: {app: web}
  template:
    metadata:
      labels: {app: web}
    spec:
      containers:
      - name: nginx
        image: nginx
        volumeMounts:
        - name: data
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 1Gi
```

> 💡 **面试重点：** StatefulSet 删除/缩容不会自动删 PVC；Pod 重建后同名 PVC 重新挂载，数据保留。

**Ingress 对外暴露**：

```
外部请求 → Ingress Controller → 按规则 → Service → Pod
```

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
spec:
  rules:
  - host: web.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-svc
            port:
              number: 80
```

> 💡 **面试重点：** Ingress 只是规则，真正转发靠 Ingress Controller（如 nginx-ingress）。

**安全上下文 / 网络策略**：

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
```

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: dev
spec:
  podSelector: {}
  policyTypes: [Ingress]
```

> 💡 **面试重点：** `runAsNonRoot + drop ALL` 是安全基线；NetworkPolicy 依赖 CNI 支持（如 Calico），未配策略时所有流量允许。

**升级与备份 etcd**：

```bash
ETCDCTL_API=3 etcdctl snapshot save snap.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data
kubeadm upgrade node
kubectl uncordon node-1
```

> 💡 **面试重点：** 升级顺序为 控制平面 → 工作节点；etcd 快照是灾难恢复的最后防线，必须定期验证可恢复。

---

## 四、Kubernetes 进阶实践

### 4.1 调度器（kube-scheduler）

```
[Pod 进入调度队列]
        │
        ▼
[预选 Predicates] ── 过滤不满足条件的节点
        │
        ▼
[优选 Priorities] ── 对剩余节点打分
        │
        ▼
[选出得分最高节点] ── bind 到该 Node
```

> 💡 **面试重点：** 调度分两阶段——预选（过滤）和优选（打分）。

- 预选：`PodFitsResources`、`PodFitsHost`、`PodMatchNodeSelector`、`NoDiskConflict` 等。
- 优选：`LeastRequestedPriority`、`BalancedResourceAllocation`、`ImageLocalityPriority` 等。

**节点亲和性（nodeAffinity）**：

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values: [node1]
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 1
      preference:
        matchExpressions:
        - key: disktype
          operator: In
          values: [ssd]
```

**Pod 亲和/反亲和（podAffinity / podAntiAffinity）**：

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values: [nginx]
      topologyKey: kubernetes.io/hostname
```

> 💡 **面试重点：** `podAntiAffinity` + `topologyKey: kubernetes.io/hostname` 是实现 Pod 跨节点打散的常用手段。

**污点（Taint）与容忍（Toleration）**：

```bash
kubectl taint nodes node1 key=value:NoSchedule
```

```yaml
tolerations:
- key: "key"
  operator: "Equal"
  value: "value"
  effect: "NoSchedule"
```

Taint effect：`NoSchedule`（不调度）、`PreferNoSchedule`（尽量不调度）、`NoExecute`（不调度且驱逐已有 Pod）。

> 💡 **面试重点：** `NoExecute` 不仅阻止新 Pod 调度，还会驱逐节点上不兼容的现有 Pod。Master 默认带 `node-role.kubernetes.io/control-plane:NoSchedule` 污点。

**调度优先级与抢占（PriorityClass）**：见第三章 3.14。

### 4.2 工作负载管理

**Deployment**（无状态，支持滚动更新与回滚）：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deploy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
```

```bash
kubectl set image deployment/nginx-deploy nginx=nginx:1.22
kubectl rollout status deployment/nginx-deploy
kubectl rollout undo deployment/nginx-deploy
```

> 💡 **面试重点：** Deployment 通过 ReplicaSet 管理 Pod 副本，版本回滚实际是切换回旧 ReplicaSet。

**StatefulSet**：Pod 名有序且稳定（`web-0.nginx.default.svc.cluster.local`），每个 Pod 绑定独立 PVC。

**DaemonSet**：每个（或匹配）节点运行一个 Pod 副本，常用于日志采集、监控代理。

**Job 与 CronJob**：

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  template:
    spec:
      containers:
      - name: pi
        image: perl
        command: ["perl", "-Mbignum=bpi", "-wle", "print bpi(2000)"]
      restartPolicy: Never
  backoffLimit: 4
```

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hello
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: hello
            image: busybox
            command: ["/bin/sh", "-c", "date; echo Hello"]
          restartPolicy: OnFailure
```

> 💡 **面试重点：** `restartPolicy` 对 Job/CronJob 只能是 `Never` 或 `OnFailure`，不能是 `Always`。

### 4.3 配置与存储管理

**ConfigMap**：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: game-config
data:
  game.properties: |
    enemies=aliens
    lives=3
```

**Secret**（默认 base64 编码，非加密）：

```bash
kubectl create secret generic db-secret --from-literal=username=admin --from-literal=password=123456
```

**Volume 与 PV/PVC**：

```
[Pod] → [PVC] → [PV] → [实际存储(NFS/ceph/云盘)]
```

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-nfs
spec:
  capacity:
    storage: 5Gi
  accessModes: [ReadWriteMany]
  nfs:
    server: 10.0.0.1
    path: "/data"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-nfs
spec:
  accessModes: [ReadWriteMany]
  resources:
    requests:
      storage: 3Gi
```

> 💡 **面试重点：** PVC 与 PV 绑定基于 `accessModes` 与 `storage` 容量匹配；PV 生命周期独立于 Pod。

**StorageClass（动态供给）**：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
```

### 4.4 服务发现与网络

**Service**：

```
[Client] → [Service(ClusterIP:port)] → [Pod1/Pod2/Pod3]  (iptables/IPVS 负载均衡)
```

类型：`ClusterIP`、`NodePort`、`LoadBalancer`、`ExternalName`。

> 💡 **面试重点：** `kube-proxy` 通过 iptables 或 IPVS 实现 Service 转发；IPVS 性能更好、支持更多后端。

**Ingress**：七层路由，按域名/路径转发（见第三章）。

**DNS 与服务发现**：CoreDNS 提供 `service.namespace.svc.cluster.local` 解析。

### 4.5 权限与安全管理（RBAC）

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

> 💡 **面试重点：** `Role` 作用域为命名空间，`ClusterRole` 集群级；`ClusterRoleBinding` 不能限定命名空间。

**ServiceAccount**：Pod 访问 API Server 的身份凭证。

```bash
kubectl create serviceaccount my-sa
```

### 4.6 资源限制与 QoS

```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "250m"
  limits:
    memory: "128Mi"
    cpu: "500m"
```

QoS 三档：Guaranteed（requests==limits）> Burstable > BestEffort。节点资源紧张时按 BestEffort→Burstable→Guaranteed 顺序驱逐。

### 4.7 健康检查（探针）

- `livenessProbe`：失败则重启容器。
- `readinessProbe`：失败则从 Service 后端摘除。
- `startupProbe`：保护慢启动容器不被误杀。

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 3
  periodSeconds: 3
readinessProbe:
  tcpSocket:
    port: 8080
  periodSeconds: 5
```

### 4.8 滚动更新与回滚策略

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

```bash
kubectl rollout history deployment/nginx-deploy
kubectl rollout undo deployment/nginx-deploy --to-revision=2
```

> 💡 **面试重点：** `maxUnavailable: 0` 保证更新过程零停机；结合 readinessProbe 才能确保流量只打到就绪 Pod。

### 4.9 自动扩缩容（HPA）

见第三章 3.9。依赖 Metrics Server，扩缩有冷却窗口。

### 4.10 进阶补充

**Pod 中断预算（PDB）**：保护自愿中断（drain/升级）期间维持最少可用副本。

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: zk-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: zookeeper
```

> 💡 **面试重点：** PDB 只保护**自愿中断**，不保护节点宕机；`minAvailable` 与 `maxUnavailable` 互斥。

**准入控制与动态准入（Admission Webhook）**：

```
客户端 → kube-apiserver → Authentication → Authorization
        → MutatingAdmission → ValidatingAdmission → etcd
```

> 💡 **面试重点：** Mutating（可改对象）与 Validating（只能拒绝/放行）区别；Webhook 失败行为由 `failurePolicy`（Fail/Ignore）决定。

**自定义资源与控制器（CRD / Operator）**：

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: crontabs.stable.example.com
spec:
  group: stable.example.com
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              cronSpec:
                type: string
              image:
                type: string
  scope: Namespaced
  names:
    plural: crontabs
    singular: crontab
    kind: CronTab
    shortNames: ["ct"]
```

> 💡 **面试重点：** Operator = CRD + 自定义控制器；核心模式是“声明式（Spec）+ 调谐（Reconcile 让实际状态趋近期望状态）”。框架：kubebuilder、operator-sdk。

**集群网络模型与 CNI**：K8s 网络需满足 Pod 扁平互通、节点与 Pod 互通、外部可访问 Service。

```
Pod A (Node1) ──┐
                ├── 底层网络/Overlay ── 路由 ── 外部
Pod B (Node2) ──┘
Service (ClusterIP) 做负载均衡到后端 Pod
```

常见插件：Flannel（VXLAN overlay）、Calico（BGP + 网络策略）、Cilium（eBPF）。

> 💡 **面试重点：** K8s 网络三大前提（Pod 扁平互通、节点与 Pod 互通、无 NAT 即可通信）；CNI 是“容器网络接口”标准，kubelet 调用插件为 Pod 配网卡。

**可观测性**：监控 Prometheus + Grafana，日志 DaemonSet 采集至 ES，链路 Jaeger。

**安全上下文与 Pod 安全（PSA）**：

```bash
kubectl label ns dev pod-security.kubernetes.io/enforce=baseline
```

> 💡 **面试重点：** PSA 三级别严格度 `privileged < baseline < restricted`；生产建议 `restricted`。

**升级、回滚与维护**：

```bash
kubectl cordon node1
kubectl drain node1 --ignore-daemonsets --delete-emptydir-data
kubeadm upgrade node
kubectl uncordon node1
```

> 💡 **面试重点：** `cordon`（不可调度但不驱逐）、`drain`（驱逐并不可调度，受 PDB 约束）、`uncordon`（恢复）。

**常见问题排查清单**：

```bash
kubectl get pods -A | grep -v Running
kubectl describe pod <pod>
kubectl logs <pod> --previous
kubectl exec -it <pod> -- sh
kubectl get events --sort-by=.lastTimestamp
kubectl describe node <node>
journalctl -u kubelet -f
```

> 💡 **面试重点：** `Pending` 多因资源/污点/亲和；`CrashLoopBackOff` 多因应用启动失败/探针误配；`ImagePullBackOff` 多因镜像名/密钥错误。

### 4.11 小结

进阶实践围绕“**稳定、安全、可观测、可控中断**”：用 PDB/优先级保护可用性，用资源配额规范用量，用污点/亲和精细调度，用 PV/PVC 与 StatefulSet 承载有状态负载，用 Operator 扩展能力，用 Ingress/Service 暴露服务，并配套监控、安全与标准排查流程。

---

## 五、基于 EFK 的 Kubernetes 日志采集方案

### 5.1 为什么要做日志采集

容器随时被调度、重启、漂移，日志落在节点本地会随 Pod 销毁丢失。集中式日志统一收集、存储、检索，便于排障与审计。

> 💡 **面试重点：** K8s 日志是“易失”的，生产必须借助集中式日志系统（如 EFK）做持久化与检索。

### 5.2 EFK 是什么

EFK = **E**lasticsearch + **F**luentd/Fluent Bit + **K**ibana。

```
[ Pod 容器 stdout/stderr ]
        |
        v
[ Fluent Bit / Fluentd ]  (DaemonSet, 每节点一个)
        |  过滤/解析/打标签
        v
[ Elasticsearch ]  (索引存储 + 检索)
        |
        v
[ Kibana ]  (Web 可视化查询)
```

- **Elasticsearch**：分布式搜索引擎，存储与全文检索。
- **Fluentd / Fluent Bit**：采集与转发 Agent。
- **Kibana**：可视化查询。

> 💡 **面试重点：** EFK 与 ELK 的区别主要在采集端（Fluentd/Fluent Bit 替代 Logstash）；ES 与 Kibana 两者共用。

### 5.3 Kubernetes 日志来源

- **标准输出/错误**：kubelet 写入节点 `/var/log/containers/*.log`（软链指向 `/var/lib/docker/containers/...`）。
- **容器内文件日志**：需挂载 volume 或由 sidecar 采集。
- **系统组件日志**：kube-apiserver、etcd 等。

```
/var/log/containers/<pod>_<namespace>_<container>-<hash>.log
        -> 软链接到
/var/lib/docker/containers/<container-id>/<container-id>-json.log
```

> 💡 **面试重点：** kubelet 把容器 stdout/stderr 统一写成 JSON 文件，路径在 `/var/log/containers/`，是 Fluent Bit 默认采集位置。

### 5.4 采集端选型：Fluent Bit vs Fluentd

| 对比项 | Fluent Bit | Fluentd |
| --- | --- | --- |
| 语言 | C | Ruby |
| 资源占用 | 极低（MB 级） | 较高 |
| 适用场景 | 边缘/节点级采集 | 服务端聚合/复杂路由 |

生产实践：Fluent Bit 作为 DaemonSet 跑在每节点采集，上游再接 Fluentd 做聚合。

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.1.0
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibcontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibcontainers
        hostPath:
          path: /var/lib/docker/containers
```

> 💡 **面试重点：** 采集 Agent 用 DaemonSet 部署，保证“每个节点一个 Pod”，无遗漏采集本节点所有容器日志。

### 5.5 Fluent Bit 核心配置

配置分三段：**INPUT（输入）→ FILTER（处理）→ OUTPUT（输出）**。

```ini
[SERVICE]
    Flush        1
    Log_Level    info
    Parsers_File parsers.conf

[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               kube.*
    Refresh_Interval  10

[FILTER]
    Name              kubernetes
    Match             kube.*
    Kube_URL          https://kubernetes.default.svc:443
    Kube_CA_File      /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File   /var/run/secrets/kubernetes.io/serviceaccount/token

[FILTER]
    Name              parser
    Match             kube.*
    Key_Name          log
    Parser            json

[OUTPUT]
    Name   es
    Match  *
    Host   elasticsearch
    Port   9200
    Index  kube-logs
```

> 💡 **面试重点：** Fluent Bit 内存占用极低（约 1MB），是采集侧首选；`tail` 模拟 `tail -f`，`kubernetes` 过滤器自动补全 Pod/Namespace/容器名等元数据。

### 5.6 Elasticsearch 索引与生命周期管理（ILM）

为避免单索引无限膨胀，采用 **ILM（Index Lifecycle Management）** 滚动索引。

```json
PUT _ilm/policy/kube-logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": { "max_size": "50gb", "max_age": "1d" }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

```json
PUT _index_template/kube-logs-template
{
  "index_patterns": ["kube-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.lifecycle.name": "kube-logs-policy",
      "index.lifecycle.rollover_alias": "kube-logs"
    }
  }
}
```

> 💡 **面试重点：** 滚动别名(`rollover_alias`) + ILM 是生产标配；按天/按大小滚动，老数据自动删除，避免 ES 磁盘被日志写爆。

### 5.7 Kibana 可视化与查询

创建索引模式 `kube-logs-*` 后检索，常用 KQL：

```
kubernetes.namespace_name : "default" and level : "error"
```

### 5.8 整体数据流

```
+--------------+     +----------------+     +-------------------+     +-----------+
| K8s 节点      |     | Fluent Bit     |     | Elasticsearch     |     | Kibana    |
| (容器 stdout) | --> | DaemonSet 采集 | --> | 存储+索引+ILM     | --> | 检索/可视化|
+--------------+     +----------------+     +-------------------+     +-----------+
     文件: /var/log/containers/*.log
```

### 5.9 常见问题与调优

- **日志丢失**：检查 `Mem_Buf_Limit`、ES 健康。
- **字段映射冲突**：用模板固定 `dynamic` 策略。
- **性能瓶颈**：调 `Flush` 间隔、ES 分片数。

```bash
curl -X GET "localhost:9200/_cluster/health?pretty"
curl -X GET "localhost:2020/api/v1/metrics"
```

> 💡 **面试重点：** ES 默认磁盘使用率超过 85% 会进入只读保护，日志写不进去是典型“采集中断”原因，排查先看集群健康与水位。

### 5.10 小结

DaemonSet 部署 Fluent Bit 零侵入采集；ES 负责存储与检索，ILM 控制成本；Kibana 提供统一入口。日志方案本质是一条“采集→解析→存储→检索”管道。

---

## 六、基于 Prometheus 的 Kubernetes 监控方案

### 6.1 为什么需要监控

> 💡 **面试重点：** 监控核心价值不是“出事了报警”，而是“用数据驱动容量规划、故障定位与稳定性保障”。

- 集群规模增长后，靠人肉观察不现实。
- 三件事：**采集**、**存储**、**告警/展示**。

### 6.2 Prometheus 是什么

- 拉模型（Pull）：主动去目标抓 `/metrics`。
- 多维数据模型：指标 = `metric name` + 一组 `label`。
- 查询语言 **PromQL**。
- 不依赖分布式存储，单机即可用；通过联邦/远程写扩展。

### 6.3 整体架构

```
            ┌────────────┐
            │  Prometheus │
            │  Server     │
            └─────┬───────┘
   pull /metrics │
        ┌────────┼───────────────┐
        ▼        ▼               ▼
   Node/Service  Exporter    Kubernetes
   (node/kube-   (mysql/      (kube-state/
    let/cadvisor)redis/...)   apiserver)
        │
        ▼
   ┌──────────┐   push   ┌─────────┐
   │  Pushgateway │◄──────│ 短时任务 │
   └──────────┘          └─────────┘
        │
        ▼
   ┌──────────┐   rule   ┌──────────┐
   │  TSDB 存储 │────────►│ Alertmanager │──► 邮件/钉钉/Slack
   └──────────┘ 评估告警  └──────────┘
        │
        ▼
   ┌──────────┐
   │  Grafana  │  (可视化)
   └──────────┘
```

- **Prometheus Server**：采集、存储、查询、告警评估。
- **Exporter**：暴露 `/metrics`，如 node-exporter、kube-state-metrics。
- **Pushgateway**：接收短生命周期任务推送。
- **Alertmanager**：去重、分组、路由、静默。
- **Grafana**：可视化前端。

### 6.4 部署 Prometheus Server

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
rule_files:
  - "rules/*.yml"
scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]
  - job_name: "node"
    static_configs:
      - targets: ["192.168.1.10:9100", "192.168.1.11:9100"]
```

```bash
./prometheus \
  --config.file=prometheus.yml \
  --storage.tsdb.path=/data/prometheus \
  --web.listen-address=:9090
```

> 💡 **面试重点：** `scrape_interval` 是抓取间隔，`evaluation_interval` 是告警规则评估间隔，二者独立。

### 6.5 指标模型与 PromQL 基础

- 格式：`metric_name{label="value",...} value timestamp`
- 示例：`node_cpu_seconds_total{mode="idle"} 12345.6 1700000000000`

```promql
100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
(node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100
rate(http_requests_total[5m])
```

> 💡 **面试重点：** `rate()` 用于计数器（Counter）求单位时间增量速率；`irate()` 更灵敏但短期波动大。

### 6.6 部署 Node Exporter

```bash
./node_exporter --web.listen-address=:9100
```

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      containers:
        - name: node-exporter
          image: prom/node-exporter:latest
          ports:
            - containerPort: 9100
```

### 6.7 在 Kubernetes 中抓取指标

```
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  cAdvisor       │  │ kube-state-       │  │  kube-apiserver  │
│ (容器/ Pod 资源) │  │ metrics(对象状态) │  │ (控制面组件)      │
└────────┬────────┘  └─────────┬────────┘  └─────────┬────────┘
         └─────────────────────┼─────────────────────┘
                               ▼
                    Prometheus 抓取 /metrics
```

- 容器级指标来自 kubelet 内置 cAdvisor；集群对象状态来自 kube-state-metrics；控制面组件自带 `/metrics`。

```bash
kubectl apply -f https://github.com/kubernetes/kube-state-metrics/releases/latest/download/kube-state-metrics.yaml
```

### 6.8 告警规则与 Alertmanager

```yaml
groups:
  - name: example
    rules:
      - alert: NodeCpuHigh
        expr: 100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "节点 {{ $labels.instance }} CPU 使用率过高"
```

```yaml
route:
  receiver: "dingtalk"
  group_by: ["alertname", "instance"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
receivers:
  - name: "dingtalk"
    webhook_configs:
      - url: "http://dingtalk-webhook:8060/dingtalk/send"
```

```
Prometheus 评估规则 ──► 触发告警 ──► Alertmanager
                                     │ 去重/分组/路由
                                     ▼
                              通知渠道(邮件/钉钉/Slack)
```

> 💡 **面试重点：** `for` 字段表示条件持续多久才真正触发，避免瞬时抖动误报；Alertmanager 负责“分组/抑制/静默/路由”，Prometheus 本身只负责“触发告警”。

### 6.9 可视化（Grafana）

- 添加 Prometheus 为数据源（URL 指向 `http://prometheus:9090`）。
- 导入官方 Dashboard（如 Node Exporter Full ID `1860`）。

### 6.10 kube-state-metrics 与 metrics-server 的区别

- **metrics-server**：节点/Pod 的 CPU、内存等资源使用率，供 HPA、`kubectl top` 使用。
- **kube-state-metrics**：监听 apiserver，把集群对象状态（副本数、Pod 状态）暴露为指标，不存历史。

> 💡 **面试重点：** metrics-server 管“资源用量”，kube-state-metrics 管“对象状态”，二者互补。

```bash
kubectl top nodes
kubectl top pods
```

### 6.11 Prometheus 服务发现（kubernetes_sd_configs）

按 role 区分：`node`、`pod`（最常用）、`service`、`endpoints`（最精准）、`ingress`。

```yaml
- job_name: 'kubernetes-pods'
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    action: replace
    target_label: __metrics_path__
    regex: (.+)
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: $1:$2
    target_label: __address__
```

> 💡 **面试重点：** `relabel_configs` 的 `keep`/`replace` 用于在采集前**过滤目标、重写标签和地址**，是 K8s 动态环境落地的关键。

Pod 上声明暴露指标：

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
```

### 6.12 持久化存储（Remote Write / Thanos / VictoriaMetrics）

```yaml
remote_write:
  - url: "http://victoria-metrics:8428/api/v1/write"
```

> 💡 **面试重点：** 标签基数爆炸是 Prometheus 生产事故头号原因——标签值必须“低基数、可枚举”。

### 6.13 常用 PromQL 速查

```promql
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
sum(container_memory_usage_bytes{pod=~"myapp.*"}) by (pod) / 1024 / 1024
sum(rate(http_requests_total{code=~"5.."}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service)
increase(kube_pod_container_status_restarts_total[1h])
```

### 6.14 Prometheus-Operator / kube-prometheus

用 `ServiceMonitor` 声明“要监控哪个 Service”，Operator 自动生成 scrape 配置。

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp-monitor
  labels:
    release: kube-prometheus
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
  - port: web
    path: /metrics
    interval: 30s
```

> 💡 **面试重点：** ServiceMonitor 是“声明式服务发现”，比手写 `kubernetes_sd_configs` 更贴近 K8s 原生运维方式。

### 6.15 常见排错清单

- 目标 `DOWN`：检查 Pod annotation、Service port、NetworkPolicy。
- 无数据：确认 `__metrics_path__` 与端口，curl 手动验证 `/metrics` 可达。
- 高基数：避免用 `id`、`timestamp` 做标签。

```bash
kubectl exec -it prometheus-0 -- sh
curl http://myapp:8080/metrics
```

### 6.16 小结

Prometheus 是 **Pull** 模型，数据持久化靠本地 TSDB，长期存储可对接 Thanos / VictoriaMetrics；高可用通常“双副本 + 联邦/远程写”。监控指标来自 `/metrics`（exporter 模式）。

---

## 七、基于 Kubernetes 的 DevOps 平台实践

### 7.1 为什么需要 DevOps 平台

传统交付存在“开发—测试—运维”壁垒：环境不一致、手工部署易错、发布慢、回滚难。

> 💡 **面试重点：** DevOps 核心目标是打破部门墙，通过**自动化流水线 + 统一平台**实现 CI/CD，提升交付效率与稳定性。

K8s 提供声明式、自愈、弹性能力，是 DevOps 理想底座：环境一致、发布可控、回滚简单、资源弹性。

### 7.2 整体架构

```
开发人员   代码仓库     CI 系统    镜像仓库      K8s 集群     监控/日志
  │─push─► │ ─webhook► │ ─构建──► │ ─推送──►  │ ─部署────►  │
```

核心组件：代码仓库（GitLab）、CI 引擎（Jenkins/GitLab CI/Tekton）、镜像仓库（Harbor）、K8s 集群、可观测（Prometheus + EFK）。

### 7.3 CI/CD 流水线设计

```
[代码拉取] → [构建与单测] → [镜像构建与推送] → [部署到 K8s]
    └──失败则通知──┴────失败则通知─────┴────失败则通知───────┴──失败则回滚/告警──
```

- **CI** 关注“构建+测试+出镜像”，**CD** 关注“把镜像可靠部署到集群”。
- **GitOps**：把“期望状态”写在 Git 里，由控制器自动 reconcile。

> 💡 **面试重点：** 流水线即代码（Pipeline as Code）相比页面点配，最大优势是“版本化、可评审、可回滚”。

示例 GitLab CI：

```yaml
stages:
  - build
  - test
  - package
  - deploy
variables:
  IMAGE: registry.example.com/myapp:$CI_COMMIT_SHORT_SHA
build:
  stage: build
  script:
    - mvn clean package -DskipTests
test:
  stage: test
  script:
    - mvn test
package:
  stage: package
  script:
    - docker build -t $IMAGE .
    - docker push $IMAGE
deploy:
  stage: deploy
  script:
    - kubectl set image deployment/myapp app=$IMAGE -n prod
```

### 7.4 镜像构建与仓库管理

多阶段构建减小体积、用非 root 用户、固定基础镜像版本：

```dockerfile
FROM maven:3.8 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/target/app.jar app.jar
USER 1000
ENTRYPOINT ["java","-jar","app.jar"]
```

私有仓库需 `imagePullSecret`：

```bash
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=admin \
  --docker-password='****' -n prod
```

```yaml
spec:
  imagePullSecrets:
    - name: regcred
  containers:
    - name: app
      image: registry.example.com/myapp:v1
```

> 💡 **面试重点：** 镜像安全三件事——**最小化基础镜像、扫描漏洞、私有仓库鉴权**。生产禁止 `latest` 标签，必须可回溯。

### 7.5 部署策略

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

| 策略 | 说明 | 适用 |
|------|------|------|
| 滚动更新 | 逐批替换 Pod | 无状态常规发布 |
| 蓝绿 | 两套环境切换流量 | 需瞬时回滚 |
| 金丝雀 | 小流量验证再全量 | 高风险变更 |

Ingress 按权重分流（金丝雀）：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
```

> 💡 **面试重点：** 蓝绿切换快但需双倍资源；金丝雀更平滑。Argo Rollouts 可声明式做金丝雀与分析门禁。

### 7.6 配置与密钥管理

```bash
kubectl create configmap app-conf --from-file=app.yaml -n prod
```

```yaml
envFrom:
  - configMapRef:
      name: app-conf
  - secretRef:
      name: app-secret
```

> 💡 **面试重点：** ConfigMap 存非敏感配置，Secret 存密码/令牌（默认 base64，需用 SealedSecret / Vault 加密）。配置与镜像解耦，改配置不重建镜像。

### 7.7 Helm 与包管理

```bash
helm upgrade --install myapp ./chart -n prod -f values-prod.yaml
helm history myapp -n prod
helm rollback myapp 2 -n prod
```

```yaml
replicaCount: 3
image:
  repository: registry.example.com/myapp
  tag: v1.2.0
resources:
  requests:
    cpu: 100m
    memory: 128Mi
```

### 7.8 流水线中的质量门禁

在 CI 嵌入“卡点”：单元测试覆盖率阈值、SonarQube 扫描、Trivy 漏洞扫描、OPA/Kyverno 准入校验。

```bash
trivy image --exit-code 1 --severity CRITICAL registry.example.com/myapp:v1
```

> 💡 **面试重点：** 质量门禁要“左移”——在 CI 阶段就拦住问题，显著降低故障成本。

### 7.9 GitOps 实践（Argo CD）

```bash
argocd app create myapp \
  --repo https://git.example.com/apps.git \
  --path prod/myapp \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace prod \
  --sync-policy auto
```

```
Git 仓库(期望状态)  ──Argo CD 持续比对──►  K8s 集群(实际状态)
        ▲                                      │
        └──── 手动改集群会被自动纠正 ──────────┘
```

> 💡 **面试重点：** GitOps 优势——**审计清晰（每次变更都是 Git commit）、回滚即 `git revert`、防配置漂移**。

### 7.10 可观测性接入

- 指标：Prometheus + Grafana
- 日志：EFK
- 链路：Jaeger / OpenTelemetry

### 7.11 常见问题与排错

```bash
kubectl describe pod myapp-xxx -n prod
kubectl logs myapp-xxx -n prod --previous
kubectl rollout status deployment/myapp -n prod
kubectl get events -n prod --sort-by=.lastTimestamp
```

- `ImagePullBackOff`：仓库地址/密钥/标签错。
- `CrashLoopBackOff`：启动命令/配置/依赖缺失。
- 发布后无流量：Service 选择器与 Pod 标签不匹配。

### 7.12 进阶补充

**多环境管理（Kustomize）**：

```bash
kustomize build overlays/prod | kubectl apply -f -
```

```yaml
# overlays/prod/kustomization.yaml
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 5
```

**密钥管理**：用 Sealed Secrets / External Secrets / Vault，密钥不进 Git。

```bash
kubectl create secret generic db-pass \
  --from-literal=password=secret -o yaml --dry-run=client \
  | kubeseal --format yaml > sealed-secret.yaml
```

**混沌工程与韧性验证（Chaos Mesh）**：

```bash
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill
spec:
  action: pod-kill
  mode: one
  selector:
    labelSelectors:
      app: my-app
  scheduler:
    cron: "@every 5m"
EOF
```

**成本优化**：设 requests/limits 防争抢；HPA 闲时缩容；Spot 节点跑可中断批处理；定期清理 Completed/Evicted Pod。

**平台总体架构**：

```
┌────────────┐   ┌────────────┐   ┌────────────┐
│  代码仓库   │──▶│  CI 流水线  │──▶│  镜像仓库   │
└────────────┘   └─────┬──────┘   └─────┬──────┘
                       │                │
                       ▼                ▼
                 ┌──────────────────────────┐
                 │    GitOps 控制器(ArgoCD)  │
                 └────────────┬─────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │  Kubernetes 集群(多环境)   │
                 └────────────┬─────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │ 监控/日志/告警 可观测性平台  │
                 └──────────────────────────┘
```

> 💡 **面试重点：** 能讲清“Git 提交 → CI 构建 → GitOps 同步 → 集群运行 → 监控反馈”这条闭环，是评价 DevOps 熟练度的关键。

### 7.13 小结

构建 K8s 上的 DevOps 平台，关键是把“人肉流程”变成“声明式 + 自动化”：CI 自动化构建测试出镜像，CD/GitOps 可靠部署回滚，Helm 模板化管理多环境，质量门禁左移风险，可观测性 + 混沌工程保障韧性。

---

## 八、基于 sharedLibrary 的 CICD 流程优化

### 8.1 为什么要用 Jenkins Shared Library

> 💡 **面试重点：** 当多个 Pipeline 项目存在大量重复逻辑（拉代码、构建、推送镜像、部署）时，应抽成 **Shared Library**，实现“一次编写、多处复用”，降低维护成本。

```
                 ┌────────────┐
                 │ Git 仓库 A │
                 └─────┬──────┘
                       │ 引用
                 ┌─────▼──────┐
   多个业务仓库──▶│ Shared     │
                 │ Library    │
                 └─────┬──────┘
                       │ 提供步骤
                 ┌─────▼──────┐
                 │ Jenkins    │
                 │ Pipeline   │
                 └────────────┘
```

### 8.2 Shared Library 的目录结构

```
(root)
├── vars/
│   ├── helloWorld.groovy      # 全局变量/步骤，可在 Jenkinsfile 直接调用
│   └── buildApp.groovy
├── src/
│   └── org/foo/               # 普通 Groovy 源码（类），需 import 使用
│       └── Utils.groovy
└── resources/                # 静态资源（json、模板等）
```

> 💡 **面试重点：** `vars/` 下的 `.groovy` 文件暴露成**全局变量（步骤）**，文件名即步骤名；`src/` 是标准 Groovy 源码树，需 `import`。`resources/` 放静态资源。

### 8.3 在 Jenkins 中配置 Shared Library

方式一：Jenkinsfile 内 `@Library` 注解：

```groovy
@Library('my-shared-library') _
pipeline {
    agent any
    stages {
        stage('Demo') {
            steps { helloWorld() }
        }
    }
}
```

方式二：Jenkins 全局配置（Manage Jenkins → Configure System → Global Pipeline Libraries）。

> 💡 **面试重点：** `@Library('库名@分支') _` 中的下划线 `_` 不能省略，它表示“导入全部全局变量/步骤”；不写会导致 `buildApp()` 等无法识别。

### 8.4 编写 vars 步骤（全局变量）

```groovy
#!/usr/bin/env groovy
def call(String name = 'human') {
    echo "Hello, ${name}."
}
```

带参数构建步骤：

```groovy
#!/usr/bin/env groovy
def call(Map config) {
    sh "echo 构建项目: ${config.projectName}"
    sh "mvn -B -DskipTests clean package -f ${config.pomPath}"
}
```

> 💡 **面试重点：** `vars/*.groovy` 中定义 `call` 方法，文件即步骤名；支持无参、单参、Map 等多种签名。

### 8.5 使用 src 下的 Groovy 类

```groovy
// src/com/example/Utils.groovy
package com.example
class Utils {
    static String getGitCommit() {
        return 'git rev-parse --short HEAD'.execute().text.trim()
    }
}
```

```groovy
// vars/buildApp.groovy
import com.example.Utils
def call() {
    def commit = Utils.getGitCommit()
    echo "Current commit: ${commit}"
}
```

### 8.6 完整 CI 流程示例

```groovy
@Library('my-shared-library') _

pipeline {
    agent any
    environment {
        REGISTRY = 'registry.example.com'
    }
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Build') {
            steps { buildApp(projectName: 'demo', pomPath: 'pom.xml') }
        }
        stage('Docker Build & Push') {
            steps { dockerBuildPush(image: "${REGISTRY}/demo", tag: 'latest') }
        }
        stage('Deploy') {
            steps { kubeDeploy(namespace: 'default', yaml: 'deploy.yaml') }
        }
    }
}
```

```
CI 流程（Shared Library 封装后）
┌─────────┐  ┌─────────┐  ┌──────────────┐  ┌─────────┐
│ Checkout│─▶│ Build   │─▶│ Docker Build  │─▶│ Deploy  │
│(scm)    │  │buildApp │  │  & Push       │  │kubeDeploy│
└─────────┘  └─────────┘  │dockerBuildPush│  └─────────┘
                           └──────────────┘
   所有步骤来自 my-shared-library
```

### 8.7 版本管理与最佳实践

锁版本引用，保证可重现：

```groovy
@Library('my-shared-library@v1.2.3') _
```

- 给 Library 仓库打 tag，避免 `main` 变动破坏旧流水线。
- 公共步骤加单元测试；把“易变”参数留在 Jenkinsfile，把“不变”逻辑放进 Library。

> 💡 **面试重点：** 生产环境务必用**固定 tag/分支**引用 Library（`@v1.2.3`），不要用浮动 `main`，否则 Library 改动会无预警影响所有流水线。

### 8.8 常见问题速查

- 步骤找不到：检查 `vars/` 文件名、Jenkins 全局库 Name。
- `src` 类报找不到：确认 `package` 与目录层级一致、`import` 路径正确。
- 权限问题：Library 仓库需 Jenkins 凭据可访问。

```
排错路径
Jenkinsfile 调用失败
   ├─ 步骤不存在? 查 vars/ 文件名 + 全局库 Name
   ├─ 类导入失败? 查 package 与目录层级
   └─ 拉取失败?   查仓库凭据 (SSH/Token)
```

### 8.9 小结

sharedLibrary 将“流程定义”与“实现细节”解耦：Jenkinsfile 仅声明阶段 → vars 封装步骤 → src 提供工具。是大型团队 CICD 治理的核心手段。

---

## 九、SpringCloud 微服务项目交付

### 9.1 微服务扫盲

**单体 vs 微服务**：单体把用户/订单/支付全塞进一个 ALL-IN-ONE 应用，耦合高、难扩展；微服务把业务拆成独立服务，各自开发/部署/扩展，经 REST API 通信，客户端通常经 **API Gateway** 访问。

> 💡 **面试重点：** 微服务的核心不是“小”，而是“独立”——独立开发、独立部署、独立扩缩容，代价是分布式复杂度（服务发现、容错、链路追踪、配置）。

**框架对比（高频）**：

| 核心要素 | Dubbo | Spring Cloud |
| -------- | ----- | ------------ |
| 服务注册 | Zookeeper | Eureka |
| 调用方式 | RPC | REST API |
| 断路器 | 不完善 | Hystrix |
| 网关 | 无 | Zuul |
| 配置/链路 | 无 | Config / Sleuth |

> 💡 **面试重点：** Dubbo 是 SOA 时代的“服务治理”工具（重 RPC 调用），Spring Cloud 是微服务时代的“生态”；Dubbo 能力只是 Spring Cloud 体系的一部分。

### 9.2 SpringBoot 交付实战

Maven：依赖查找顺序 本地 `~/.m2` → 私服/镜像 → 中央仓库；`groupId+artifactId+version` 唯一锁定；`parent` 统一定义版本。

私服镜像配置（提速）：

```xml
<mirrors>
    <mirror>
      <id>alimaven</id>
      <name>aliyun maven</name>
      <url>http://maven.aliyun.com/nexus/content/groups/public/</url>
      <mirrorOf>central</mirrorOf>
    </mirror>
</mirrors>
```

镜像制作与 CICD：

```dockerfile
FROM openjdk:8-jdk-alpine
COPY target/springboot-demo.jar app.jar
CMD [ "sh", "-c", "java -jar /app.jar" ]
```

```bash
docker build . -t springboot-demo:v1 -f Dockerfile
docker run -d --name springboot-demo -p 8080:8080 springboot-demo:v1
curl localhost:8080
```

> 💡 **面试重点：** slave-pod 销毁会清掉 maven 缓存，需把 `/opt/maven-repo` 挂载出来，否则每次全量拉依赖。

### 9.3 服务注册中心 Eureka

**作用**：维护“服务名 → 实例列表”，微服务通过 HTTP 互相发现调用。

新建 Eureka Server：

```yaml
server:
  port: 8761
eureka:
  client:
    service-url:
      defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/
    register-with-eureka: false
    fetch-registry: false
  instance:
    hostname: localhost
```

注册服务（客户端）：

```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: http://${EUREKA_USER:admin}:${EUREKA_PASS:admin}@localhost:8761/eureka/
  instance:
    instance-id: ${eureka.instance.hostname}:${server.port}
    prefer-ip-address: true
    hostname: user-service
spring:
  application:
    name: user-service
```

> 💡 **面试重点：** 自我保护模式（self-preservation）——15 分钟内心跳续约率低于 85%（默认 `renewalPercentThreshold=0.85`），Eureka 进入保护态，不再注销任何实例，防止网络抖动误杀健康服务。**生产保持默认开启**。

**K8s 交付**（StatefulSet + Headless Service）：

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: eureka-cluster
  namespace: dev
spec:
  serviceName: "eureka"
  replicas: 3
  selector:
    matchLabels:
      app: eureka-cluster
  template:
    metadata:
      labels:
        app: eureka-cluster
    spec:
      containers:
        - name: eureka
          image: 172.21.51.143:5000/spring-cloud/eureka-cluster:v1
          ports:
            - containerPort: 8761
          env:
            - name: EUREKA_SERVER
              value: "http://admin:admin@eureka-cluster-0.eureka:8761/eureka/,http://admin:admin@eureka-cluster-1.eureka:8761/eureka/,http://admin:admin@eureka-cluster-2.eureka:8761/eureka/"
            - name: EUREKA_INSTANCE_HOSTNAME
              value: ${MY_POD_NAME}.eureka
```

> 💡 **面试重点：** 为什么 Eureka 用 StatefulSet 而非 Deployment？注册中心需要稳定网络标识和有序启动，StatefulSet 提供固定 Pod 名 + 持久化网络身份。

### 9.4 服务间调用（消费者）

三种调用方式：原生 `RestTemplate`（写死 IP）→ `@LoadBalanced RestTemplate`（按服务名路由）→ **Feign（声明式，最优雅）**。本质底层都是 `RestTemplate`，只是封装增强。

**Feign**：

```java
@FeignClient(name="user-service")
public interface UserServiceCli {
    @GetMapping("/user")
    public String getUserService();
    @GetMapping("/user/{id}")
    public User getUserInfo(@PathVariable("id") int id);
}
```

**Ribbon 客户端负载均衡**：`eureka-client` 已含 ribbon，从注册中心拉实例列表在客户端侧选一个。

```yaml
user-service:
  ribbon:
    NFLoadBalancerRuleClassName: com.netflix.loadbalancer.RandomRule
```

> 💡 **面试重点：** 客户端负载均衡 vs 服务端负载均衡——Ribbon 在调用方进程内选实例（客户端），Nginx 在调用方之前转发（服务端）。默认轮询，可用注解/配置换 RandomRule 等。

### 9.5 断路器 Hystrix

**机制**：统计失败次数，维护**打开/关闭/半开**三态，提供 fallback 降级。

```java
@FeignClient(name="user-service", fallback = UserServiceFallbackImpl.class)
public interface UserServiceCli { ... }

@Component
public class UserServiceFallbackImpl implements UserServiceCli{
    @Override public String getUserService() { return "fallback user service"; }
}
```

启动类加 `@EnableCircuitBreaker`，配置 `feign.hystrix.enabled: true`。

> 💡 **面试重点：** 断路器三态机——关闭（正常）→ 失败率超阈值打开（直接走 fallback，快速失败）→ 休眠窗后半开（放部分流量探测，成功则关闭，失败继续打开）。核心是“故障隔离 + 快速失败”。

### 9.6 微服务网关 Zuul

统一入口，按 URL 路由到不同服务，承担鉴权、限流、日志、协议转换。

```java
@SpringBootApplication
@EnableZuulProxy
@EnableDiscoveryClient
public class GatewayZuulApplication { ... }
```

```yaml
zuul:
  routes:
    user-service: /users/**
    bill-service:
      path: /bill/**
      service-id: bill-service
```

访问 `localhost:10000/users/user/1` → `user-service:7000/user/1`；`/actuator/routes` 查看路由表。

### 9.7 调用链路追踪 Sleuth + Zipkin

一次请求从入口到返回称为一个 **trace**，链路中每调一个服务埋一个 **span**，多个有序 span 组成 trace。

```yaml
spring:
  zipkin:
    base-url: http://zipkin.luffy.com
    sender:
      type: web
  sleuth:
    sampler:
      probability: 1
logging:
  level:
    org.springframework.cloud: debug
```

### 9.8 SpringBoot Admin 监控

服务端引 `spring-boot-admin-starter-server` + `@EnableAdminServer` 并注册到 Eureka；客户端加 `spring-boot-admin-starter-client` 即被纳管。

### 9.9 整体架构

```
                        ┌─────────────────────────────┐
   外部请求 ───────────▶ │        Zuul 网关 (10000)      │  统一入口/路由/鉴权/限流
                        └──────────────┬──────────────┘
                                       │ 按服务名路由
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
      [user-service:7000]    [bill-service:7001]        [其他微服务...]
              │  @FeignClient            │  Ribbon 客户端负载均衡
              └────────────┬─────────────┘
                           ▼
                  ┌──────────────────┐
                  │  Eureka 注册中心   │  StatefulSet ×3
                  │     (8761)        │
                  └──────────────────┘
        Hystrix 断路器 · Sleuth+Zipkin 链路追踪 · SpringBoot Admin 监控
```

### 9.10 小结

1. 业务复杂化催生微服务，微服务带来“服务治理”难题（发现、调用、负载、追踪）。
2. Spring Cloud 是生态（基于 Java），Netflix 套件提供 eureka/ribbon/feign/hystrix/zuul，sleuth+zipkin 做追踪。
3. SpringBoot 是开发框架，靠 Maven 与 Cloud 组件集成。

> 💡 **面试重点：** Spring Cloud Netflix 组件本职——Eureka 发现、Ribbon 负载、Feign 声明式调用、Hystrix 熔断、Zuul 网关，五者通过 Eureka 串联成治理闭环。

**演进思考**：Dubbo/Spring Cloud 绑定 Java、对业务有代码侵入；K8s 原生自带服务发现与负载均衡；以 Istio 为代表的 Service Mesh（Sidecar 模式）正成为第二代服务治理主流。

---

## 十、基于 Istio 实现微服务治理

### 10.1 服务网格与 Istio 是什么

**服务网格（Service Mesh）** 解决微服务化后的服务间通信与治理：把流量治理逻辑从业务代码剥离到 Sidecar 代理，实现“数据面（业务）”与“控制面（治理）”解耦。

```
Service Mesh 核心：数据面 / 控制面解耦
  驾驶者(业务) 专注跑赛道
  边车领航员(网格) 专注导航/治理
```

- 第一代：Linkerd、Envoy（以 Sidecar 为核心 proxy）。
- 第二代：**Istio**（Google + IBM + Lyft），事实标准。

> 💡 **面试重点：** Service Mesh 的本质是“将服务治理能力下沉到与应用同生命周期的 Sidecar 中”，相比 Spring Cloud 做到语言无关、无侵入、业务无感知。

### 10.2 安装与注入

```bash
wget https://github.com/istio/istio/releases/download/1.13.2/istio-1.13.2-linux-amd64.tar.gz
tar zxf istio-1.13.2-linux-amd64.tar.gz
cp bin/istioctl /bin/
istioctl install --set profile=demo
kubectl -n istio-system get po
```

Sidecar 注入两种方式：
- 手动：`istioctl kube-inject -f xxx.yaml | kubectl apply -f -`
- 自动：给命名空间打 `istio-injection=enabled` 标签

```bash
kubectl label namespace default istio-injection=enabled
```

注入后每个 Pod 新增：`istio-init`（初始化，写 iptables 后退出）、`istio-proxy`（Envoy，含 pilot-agent + envoy）。

```bash
istio-iptables -p 15001 -z 15006 -u 1337 -m REDIRECT -i '*' -x "" -b '*' -d 15090,15021,15020
```

> 💡 **面试重点：** Istio 通过 `istio-init` 注入的 iptables 规则把 Pod 全部入站/出站 TCP 流量重定向到 Envoy（15001 出站 / 15006 入站），业务容器完全无感知。

### 10.3 Envoy 与 xDS

- **Listener**：监听地址/端口；**Filter**：可插拔处理层；**Route**：路由规则；**Cluster**：上游服务集群。

**xDS**：Envoy 的动态配置发现服务（LDS/RDS/CDS/EDS）。Istiod 中的 **Pilot** 是 xDS 服务端。

> 💡 **面试重点：** Envoy 靠 xDS（LDS/RDS/CDS/EDS）从控制面动态获取配置并热 reload，无需重启即可生效——这是 Istio 实时治理的基础。

### 10.4 工作原理（一次调用的完整链路）

```
Pod 内业务容器
  -> iptables 重定向出站(15001)  [virtualOutbound]
  -> 0.0.0.0_<Port> 虚拟监听器
  -> RDS route(按 domains 匹配 VirtualService)
  -> 加权 cluster(outbound|9999|v1=90% / v2=10%)
  -> EDS endpoint(Pod IP)
  -> 经 k8s 网络发出(UID=1337 不再被拦截)
  -> 目标 Pod 入站被 15006 拦截 [virtualInbound]
  -> inbound cluster -> 127.0.0.1:<业务端口>
```

排障命令：

```bash
istioctl pc listener <pod>.ns --port 15001 -ojson
istioctl pc route <pod>.ns --name 9999
istioctl pc cluster <pod>.ns --fqdn <svc>.svc.cluster.local -ojson
istioctl pc endpoint <pod>.ns --cluster <cluster> -ojson
```

> 💡 **面试重点：** 在 Istio 网格内，服务间流量**完全绕过 kube-proxy**（停掉 kube-proxy 后网格内互访仍正常），由 Envoy 直接接管。

### 10.5 核心 CRD：VirtualService 与 DestinationRule

- **VirtualService**：定义“怎么路由”（权重、路径、header、重试、故障注入、镜像）。
- **DestinationRule**：定义“目标子集与策略”（subsets 按 label 划分版本、负载均衡、连接池）。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: dest-bill-service
  namespace: istio-demo
spec:
  host: bill-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: vs-bill-service
  namespace: istio-demo
spec:
  hosts:
  - bill-service
  http:
  - name: bill-service-route
    route:
    - destination:
        host: bill-service
        subset: v1
      weight: 90
    - destination:
        host: bill-service
        subset: v2
      weight: 10
```

> 💡 **面试重点：** VS 管“路由规则”，DR 管“目标与策略”；权重是 VS 上的 `weight`，版本划分是 DR 上的 `subsets`（按 label）。权重按“请求数”分配，与副本数无关。

负载均衡策略（DestinationRule 配置）：

| 策略 | 说明 |
| --- | --- |
| `ROUND_ROBIN` | 轮询（默认） |
| `LEAST_CONN` | 最少连接 |
| `RANDOM` | 随机 |
| `PASSTHROUGH` | 透传原 IP（慎用） |

### 10.6 入口流量：Gateway vs Ingress

K8s Ingress 只能表达最基础 HTTP 路由；Istio **Gateway** 把 L4-L6（端口、TLS）与 L7（路由）分离：Gateway 管入口与 TLS，VirtualService 绑定 Gateway 控 HTTP/TCP 路由。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: front-tomcat-gateway
  namespace: istio-demo
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - tomcat.istio-demo.com
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: gateway-front-tomcat
  namespace: istio-demo
spec:
  gateways:
  - front-tomcat-gateway
  hosts:
  - tomcat.istio-demo.com
  http:
  - name: front-tomcat-route
    route:
    - destination:
        host: front-tomcat
        subset: v1
      weight: 90
    - destination:
        host: front-tomcat
        subset: v2
      weight: 10
```

```bash
kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}'
```

> 💡 **面试重点：** Gateway 规则只对“经该网关进入的外部流量”生效，网格内其他服务的内部调用不受其约束。

### 10.7 路由匹配类型

**权重路由**（灰度基础）：见上 VS `weight`。

**路径路由 / 路径重写**：

```yaml
  http:
  - name: ratings-route
    match:
    - uri:
        prefix: /rate
    rewrite:
      uri: "/ratings"
    route:
    - destination:
        host: ratings
```

**Header 路由**（金丝雀）：

```yaml
  http:
  - match:
    - headers:
        end-user:
          exact: luffy
    route:
    - destination:
        host: reviews
        subset: v3
  - route:
    - destination:
        host: reviews
        subset: v2
```

### 10.8 流量镜像（Shadow Traffic）

把生产流量复制一份到镜像服务，主链路不受影响，用真实流量验证新版本。

```yaml
    route:
    - destination:
        host: httpbin
        subset: v1
    mirror:
      host: httpbin
      subset: v2
    mirror_percent: 100
```

### 10.9 重试与熔断

```yaml
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx
```

> 💡 **面试重点：** Istio 的重试/超时/熔断/故障注入全部是“声明式、无侵入”配置在 VirtualService / DestinationRule 上，业务代码零改动。

### 10.10 故障注入与超时

两类：`delay`（注入延迟）、`abort`（注入异常状态码）。

```yaml
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 2s
    route:
    - destination:
        host: ratings
```

```yaml
  http:
  - fault:
      abort:
        percentage:
          value: 50
        httpStatus: 500
    route:
    - destination:
        host: details
```

超时在 VS 的 `http` 顶层 `timeout` 设置：

```yaml
  http:
  - route:
    - destination:
        host: reviews
        subset: v2
    timeout: 0.5s
```

### 10.11 可观测性

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/jaeger.yaml
kubectl apply -f samples/addons/kiali.yaml
```

- **Prometheus**：核心 target 是 `kubernetes-pods`，指标由每个 Sidecar（Envoy 15020 `/stats/prometheus`）直接提供。
- **Grafana**：Istio Mesh Dashboard。
- **Jaeger**：分布式追踪。
- **Kiali**：服务拓扑与流量可视化。

> 💡 **面试重点：** Istio 可观测性（指标/追踪/日志）由 Sidecar 自动产生并上报，业务无侵入；Prometheus 指标直接来自 Envoy，无需业务埋点。

### 10.12 重点回顾（Productpage → Reviews 全流程）

```
1. Productpage 调用 http://reviews:9080/reviews/0
2. 出站被 iptables 重定向到本机 15001 [virtualOutbound]
3. 转到 0.0.0.0_9080 监听器
4. RDS route(9080) 按 domains 匹配 -> outbound|9080|vX|reviews... cluster
5. cluster 为 EDS, 经 endpoint 拿到 Reviews Pod IP
6. Envoy(UID=1337) 直接经 k8s 网络发出(不再被拦截)
7. 目标 Pod 入站被 15006 [virtualInbound] 拦截
8. virtualInbound 直接转给 inbound cluster -> 127.0.0.1:<业务端口>
```

核心结论速记：
- Sidecar = 每个 Pod 一个 Envoy，接管全部出入流量（15001/15006）。
- 控制面 Istiod(Pilot) 经 xDS 下发规则，Envoy 热更新。
- 网格内流量**不走 kube-proxy**。
- VS（路由规则）+ DR（目标/策略）是治理两大基石。
- 重试/熔断/故障注入/镜像/灰度 = 声明式、无侵入。

---

> 全文完。本文档为十篇 K8s 系列文档的精简面试向总结，删图改 ASCII、保留全部操作命令与代码、标注常考知识点。
