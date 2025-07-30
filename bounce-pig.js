// 愤怒小猪风格的弹射游戏
class SlingshotPig {
    constructor() {
        this.pig = document.getElementById('pig');
        this.pigContainer = document.getElementById('pigContainer');
        this.gameArea = document.getElementById('gameArea');
        this.slingshot = document.getElementById('slingshot');
        this.slingshotBand = document.getElementById('slingshotBand');
        this.trajectory = document.getElementById('trajectory');
        this.trajectoryPath = document.getElementById('trajectoryPath');

        this.effects = document.getElementById('effects');
        this.particles = document.getElementById('particles');
        this.resetButton = document.getElementById('resetButton');
        
        // 物理属性
        this.pigSize = 80;
        this.originalX = 130;
        this.originalY = window.innerHeight - 200;
        this.x = this.originalX;
        this.y = this.originalY;
        this.vx = 0;
        this.vy = 0;
        this.gravity = 0.3;
        this.airResistance = 0.9995;
        this.bounce = 0.85;
        this.minBounce = 0.6;
        
        // 状态
        this.isDragging = false;
        this.isFlying = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.maxDragDistance = 120;
        
        // 边界
        this.bounds = {
            left: this.pigSize / 2,
            right: window.innerWidth - this.pigSize / 2,
            top: this.pigSize / 2 + 120,
            bottom: window.innerHeight - this.pigSize / 2 - 20
        };
        
        // 轨迹点
        this.trailPoints = [];
        this.maxTrailPoints = 8;
        
        this.init();
    }
    
    init() {
        this.updatePosition();
        this.bindEvents();
        this.animate();
        this.startBlinking();
        
        console.log('🎯 愤怒小猪已准备就绪！拖拽猪猪瞄准发射！');
    }
    
    bindEvents() {
        // 鼠标/触摸事件
        this.pig.addEventListener('mousedown', (e) => this.startDrag(e));
        this.pig.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]), { passive: false });
        
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('touchmove', (e) => this.drag(e.touches[0]), { passive: false });
        
        document.addEventListener('mouseup', () => this.endDrag());
        document.addEventListener('touchend', () => this.endDrag());
        
        // 眼睛跟随
        document.addEventListener('mousemove', (e) => this.updateEyes(e));
        
        // 复位按钮
        this.resetButton.addEventListener('click', () => this.resetPig());
        
        // 窗口大小改变
        window.addEventListener('resize', () => this.updateBounds());
    }
    
    startDrag(event) {
        if (this.isFlying) return;
        
        this.isDragging = true;
        this.pig.classList.add('dragging');
        
        const rect = this.pigContainer.getBoundingClientRect();
        this.dragStartX = event.clientX - rect.left;
        this.dragStartY = event.clientY - rect.top;
        
        event.preventDefault();
    }
    
    drag(event) {
        if (!this.isDragging || this.isFlying) return;
        
        const deltaX = event.clientX - (this.originalX + this.dragStartX);
        const deltaY = event.clientY - (this.originalY + this.dragStartY);
        
        // 限制拖拽距离
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = this.maxDragDistance;
        
        if (distance > maxDistance) {
            const ratio = maxDistance / distance;
            this.x = this.originalX + deltaX * ratio;
            this.y = this.originalY + deltaY * ratio;
        } else {
            this.x = this.originalX + deltaX;
            this.y = this.originalY + deltaY;
        }
        
        // 更新弹弓带子
        this.updateSlingshotBand();
        
        // 显示轨迹预测
        this.showTrajectory(deltaX, deltaY);
        
        event.preventDefault();
    }
    
    endDrag() {
        if (!this.isDragging || this.isFlying) return;
        
        this.isDragging = false;
        this.pig.classList.remove('dragging');
        
        // 计算发射速度
        const deltaX = this.originalX - this.x;
        const deltaY = this.originalY - this.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > 20) { // 最小发射距离
            const power = Math.min(distance / this.maxDragDistance, 1);
            const launchPower = power * 25;
            
            this.vx = (deltaX / distance) * launchPower;
            this.vy = (deltaY / distance) * launchPower;
            
            this.launch();
        } else {
            // 回到原位
            this.returnToSlingshot();
        }
        
        // 隐藏轨迹和重置UI
        this.hideTrajectory();
        this.resetSlingshotBand();
    }
    
    launch() {
        this.isFlying = true;
        this.pig.classList.add('flying');
        
        // 创建发射特效
        this.createLaunchEffect();
        
        console.log('🚀 猪猪发射！初始速度:', Math.round(Math.sqrt(this.vx * this.vx + this.vy * this.vy)));
    }
    
    animate() {
        if (this.isFlying) {
            this.updatePhysics();
            this.checkCollisions();
            this.updateTrail();
        }
        
        this.updatePosition();
        requestAnimationFrame(() => this.animate());
    }
    
    updatePhysics() {
        // 应用重力
        this.vy += this.gravity;
        
        // 空气阻力
        this.vx *= this.airResistance;
        this.vy *= this.airResistance;
        
        // 更新位置
        this.x += this.vx;
        this.y += this.vy;
        
        // 检查是否停止（更宽松的条件，允许更多弹跳）
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed < 0.5 && this.y >= this.bounds.bottom - 3 && Math.abs(this.vy) < 0.3) {
            this.stopFlying();
        }
    }
    
    checkCollisions() {
        let bounced = false;
        const currentBounce = Math.max(this.bounce * Math.sqrt(Math.abs(this.vx) + Math.abs(this.vy)) / 20, this.minBounce);
        
        // 左右边界
        if (this.x <= this.bounds.left) {
            this.x = this.bounds.left;
            this.vx = -this.vx * currentBounce;
            bounced = true;
            this.createImpactEffect(this.bounds.left, this.y);
        } else if (this.x >= this.bounds.right) {
            this.x = this.bounds.right;
            this.vx = -this.vx * currentBounce;
            bounced = true;
            this.createImpactEffect(this.bounds.right, this.y);
        }
        
        // 上下边界
        if (this.y <= this.bounds.top) {
            this.y = this.bounds.top;
            this.vy = -this.vy * currentBounce;
            bounced = true;
            this.createImpactEffect(this.x, this.bounds.top);
        } else if (this.y >= this.bounds.bottom) {
            this.y = this.bounds.bottom;
            this.vy = -this.vy * currentBounce;
            bounced = true;
            this.createImpactEffect(this.x, this.bounds.bottom);
        }
        
        if (bounced) {
            console.log('💥 弹跳！速度:', Math.round(Math.sqrt(this.vx * this.vx + this.vy * this.vy)));
        }
    }
    
    updateTrail() {
        // 添加轨迹点
        this.trailPoints.push({ x: this.x, y: this.y, time: Date.now() });
        
        // 限制轨迹点数量
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.shift();
        }
        
        // 创建轨迹粒子
        if (Math.random() < 0.3) {
            this.createTrailParticle();
        }
    }
    
    updatePosition() {
        this.pigContainer.style.left = this.x + 'px';
        this.pigContainer.style.bottom = (window.innerHeight - this.y) + 'px';
        this.pigContainer.style.transform = 'translate(-50%, 50%)';
    }
    
    updateSlingshotBand() {
        const bandCenterX = 130;
        const bandCenterY = window.innerHeight - 150;
        
        const angle = Math.atan2(this.y - bandCenterY, this.x - bandCenterX);
        const distance = Math.sqrt((this.x - bandCenterX) ** 2 + (this.y - bandCenterY) ** 2);
        
        this.slingshotBand.style.width = distance + 'px';
        this.slingshotBand.style.transform = `rotate(${angle}rad)`;
        this.slingshotBand.style.transformOrigin = 'left center';
    }
    
    resetSlingshotBand() {
        this.slingshotBand.style.width = '24px';
        this.slingshotBand.style.transform = 'rotate(0deg)';
    }
    
    showTrajectory(deltaX, deltaY) {
        const steps = 15;
        const timeStep = 0.5;
        let pathData = '';
        
        let predX = this.x;
        let predY = this.y;
        let predVx = (deltaX / Math.sqrt(deltaX * deltaX + deltaY * deltaY)) * -20;
        let predVy = (deltaY / Math.sqrt(deltaX * deltaX + deltaY * deltaY)) * -20;
        
        pathData += `M ${predX} ${window.innerHeight - predY}`;
        
        for (let i = 0; i < steps; i++) {
            predVy += this.gravity * timeStep;
            predX += predVx * timeStep * 10;
            predY += predVy * timeStep * 10;
            
            pathData += ` L ${predX} ${window.innerHeight - predY}`;
            
            if (predY <= this.bounds.top || predY >= this.bounds.bottom) break;
        }
        
        this.trajectoryPath.setAttribute('d', pathData);
    }
    
    hideTrajectory() {
        this.trajectoryPath.setAttribute('d', '');
    }
    
    stopFlying() {
        this.isFlying = false;
        this.vx = 0;
        this.vy = 0;
        this.pig.classList.remove('flying');
        this.trailPoints = [];
        
        // 延迟后回到弹弓
        setTimeout(() => {
            this.returnToSlingshot();
        }, 1000);
        
        console.log('🛬 猪猪停止飞行！');
    }
    
    returnToSlingshot() {
        const duration = 1500;
        const startX = this.x;
        const startY = this.y;
        const startTime = Date.now();
        
        const moveBack = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.x = startX + (this.originalX - startX) * easeProgress;
            this.y = startY + (this.originalY - startY) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(moveBack);
            }
        };
        
        moveBack();
    }
    
    resetPig() {
        // 停止当前飞行状态
        this.isFlying = false;
        this.isDragging = false;
        this.vx = 0;
        this.vy = 0;
        
        // 清除所有状态
        this.pig.classList.remove('flying', 'dragging');
        this.trailPoints = [];
        
        // 隐藏轨迹和重置弹弓
        this.hideTrajectory();
        this.resetSlingshotBand();
        
        // 立即回到弹弓位置
        this.x = this.originalX;
        this.y = this.originalY;
        this.updatePosition();
        
        // 创建复位特效
        this.createResetEffect();
        
        console.log('🔄 猪猪已复位！');
    }
    
    createLaunchEffect() {
        // 发射烟雾效果
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.position = 'absolute';
            particle.style.left = this.x + 'px';
            particle.style.bottom = (window.innerHeight - this.y) + 'px';
            particle.style.width = (4 + Math.random() * 6) + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = ['#ff6b9d', '#ffb3d9', '#ff8cc8', '#ffffff'][Math.floor(Math.random() * 4)];
            particle.style.borderRadius = '50%';
            particle.style.transform = 'translate(-50%, 50%)';
            
            this.particles.appendChild(particle);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            const distance = 30 + Math.random() * 40;
            
            particle.animate([
                {
                    transform: 'translate(-50%, 50%) scale(1)',
                    opacity: 0.8
                },
                {
                    transform: `translate(-50%, 50%) translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: 800 + Math.random() * 600,
                easing: 'ease-out'
            }).onfinish = () => particle.remove();
        }
    }
    
    createImpactEffect(x, y) {
        const impact = document.createElement('div');
        impact.className = 'impact-effect';
        impact.style.left = x + 'px';
        impact.style.bottom = (window.innerHeight - y) + 'px';
        impact.style.transform = 'translate(-50%, 50%)';
        
        this.effects.appendChild(impact);
        
        // 撞击粒子
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.position = 'absolute';
            particle.style.left = x + 'px';
            particle.style.bottom = (window.innerHeight - y) + 'px';
            particle.style.width = '3px';
            particle.style.height = '3px';
            particle.style.background = '#ffffff';
            particle.style.borderRadius = '50%';
            particle.style.boxShadow = '0 0 6px #ff6b9d';
            particle.style.transform = 'translate(-50%, 50%)';
            
            this.particles.appendChild(particle);
            
            const angle = (i / 12) * Math.PI * 2;
            const distance = 20 + Math.random() * 25;
            
            particle.animate([
                {
                    transform: 'translate(-50%, 50%) scale(1)',
                    opacity: 1
                },
                {
                    transform: `translate(-50%, 50%) translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: 500,
                easing: 'ease-out'
            }).onfinish = () => particle.remove();
        }
        
        setTimeout(() => impact.remove(), 600);
    }
    
    createTrailParticle() {
        const particle = document.createElement('div');
        particle.className = 'trail-particle';
        particle.style.left = this.x + 'px';
        particle.style.bottom = (window.innerHeight - this.y) + 'px';
        particle.style.transform = 'translate(-50%, 50%)';
        
        this.particles.appendChild(particle);
        
        setTimeout(() => particle.remove(), 500);
    }
    
    createResetEffect() {
        // 复位时的闪光特效
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.position = 'absolute';
            particle.style.left = this.x + 'px';
            particle.style.bottom = (window.innerHeight - this.y) + 'px';
            particle.style.width = '6px';
            particle.style.height = '6px';
            particle.style.background = '#ffffff';
            particle.style.borderRadius = '50%';
            particle.style.boxShadow = '0 0 10px #ff6b9d';
            particle.style.transform = 'translate(-50%, 50%)';
            
            this.particles.appendChild(particle);
            
            const angle = (i / 10) * Math.PI * 2;
            const distance = 25 + Math.random() * 15;
            
            particle.animate([
                {
                    transform: 'translate(-50%, 50%) scale(0)',
                    opacity: 1
                },
                {
                    transform: `translate(-50%, 50%) translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(1)`,
                    opacity: 1
                },
                {
                    transform: `translate(-50%, 50%) translate(${Math.cos(angle) * distance * 1.5}px, ${Math.sin(angle) * distance * 1.5}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: 600,
                easing: 'ease-out'
            }).onfinish = () => particle.remove();
        }
    }
    
    updateEyes(event) {
        if (this.isFlying) return;
        
        const pupils = document.querySelectorAll('.pupil');
        const rect = this.pig.getBoundingClientRect();
        const pigCenterX = rect.left + rect.width / 2;
        const pigCenterY = rect.top + rect.height / 2;
        
        const angle = Math.atan2(event.clientY - pigCenterY, event.clientX - pigCenterX);
        const distance = Math.min(2, Math.sqrt((event.clientX - pigCenterX) ** 2 + (event.clientY - pigCenterY) ** 2) / 150);
        
        pupils.forEach(pupil => {
            const offsetX = Math.cos(angle) * distance;
            const offsetY = Math.sin(angle) * distance;
            pupil.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        });
    }
    
    startBlinking() {
        const blink = () => {
            this.pig.classList.add('blinking');
            setTimeout(() => {
                this.pig.classList.remove('blinking');
            }, 150);
        };
        
        const scheduleNextBlink = () => {
            setTimeout(() => {
                blink();
                scheduleNextBlink();
            }, 2000 + Math.random() * 4000);
        };
        
        scheduleNextBlink();
    }
    
    updateBounds() {
        this.bounds = {
            left: this.pigSize / 2,
            right: window.innerWidth - this.pigSize / 2,
            top: this.pigSize / 2 + 120,
            bottom: window.innerHeight - this.pigSize / 2 - 20
        };
        
        this.originalY = window.innerHeight - 200;
        if (!this.isFlying && !this.isDragging) {
            this.x = this.originalX;
            this.y = this.originalY;
        }
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new SlingshotPig();
});