using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Windows.Forms;

sealed class SelectionEditor : Form {
    readonly Image original;
    readonly SelectionCanvas canvas;
    public string Mask {get;private set;}
    public string NormalizedReference {get;private set;}
    public SelectionEditor(string dataUrl){
        using(var stream=new MemoryStream(Convert.FromBase64String(dataUrl.Substring(dataUrl.IndexOf(',')+1))))using(var image=Image.FromStream(stream)){
            if((long)image.Width*image.Height>20000000)throw new Exception("Use uma imagem de até 20 megapixels.");
            original=new Bitmap(image);
            if(Array.IndexOf(image.PropertyIdList,274)>=0){int orientation=image.GetPropertyItem(274).Value[0];var rotation=RotateFlipType.RotateNoneFlipNone;switch(orientation){case 2:rotation=RotateFlipType.RotateNoneFlipX;break;case 3:rotation=RotateFlipType.Rotate180FlipNone;break;case 4:rotation=RotateFlipType.Rotate180FlipX;break;case 5:rotation=RotateFlipType.Rotate90FlipX;break;case 6:rotation=RotateFlipType.Rotate90FlipNone;break;case 7:rotation=RotateFlipType.Rotate270FlipX;break;case 8:rotation=RotateFlipType.Rotate270FlipNone;break;}original.RotateFlip(rotation);}
        }
        Text="Marque a área a reconstruir · arraste um retângulo";ClientSize=new Size(850,650);MinimumSize=new Size(500,400);StartPosition=FormStartPosition.CenterParent;BackColor=Color.FromArgb(22,18,30);ForeColor=Color.White;
        var layout=new TableLayoutPanel {Dock=DockStyle.Fill,RowCount=2,ColumnCount=1};layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));layout.RowStyles.Add(new RowStyle(SizeType.Absolute,48));Controls.Add(layout);
        canvas=new SelectionCanvas(original);layout.Controls.Add(canvas,0,0);
        var apply=new Button {Text="Usar área marcada",Dock=DockStyle.Fill,BackColor=Color.FromArgb(140,104,200),FlatStyle=FlatStyle.Flat};layout.Controls.Add(apply,0,1);
        apply.Click+=delegate{
            Rectangle area=canvas.ImageSelection;
            if(area.Width<3||area.Height<3){MessageBox.Show(this,"Arraste um retângulo sobre a pessoa ou objeto que deseja remover.");return;}
            using(var normalized=new MemoryStream()){original.Save(normalized,ImageFormat.Png);if(normalized.Length>10*1024*1024){MessageBox.Show(this,"A referência PNG excedeu 10 MB. Reduza as dimensões antes de marcar a área.");return;}NormalizedReference="data:image/png;base64,"+Convert.ToBase64String(normalized.ToArray());}
            using(var mask=new Bitmap(original.Width,original.Height,PixelFormat.Format24bppRgb))using(var graphics=Graphics.FromImage(mask))using(var stream=new MemoryStream()){
                graphics.Clear(Color.Black);graphics.FillRectangle(Brushes.White,area);int feather=Math.Min(8,Math.Min(area.Width,area.Height)/3);for(int i=0;i<feather;i++){int value=(int)(255.0*i/feather);using(var edge=new Pen(Color.FromArgb(value,value,value)))graphics.DrawRectangle(edge,area.X+i,area.Y+i,area.Width-1-2*i,area.Height-1-2*i);}mask.Save(stream,ImageFormat.Png);Mask="data:image/png;base64,"+Convert.ToBase64String(stream.ToArray());
            }
            DialogResult=DialogResult.OK;Close();
        };
        FormClosed+=delegate{original.Dispose();};
    }
}

sealed class SelectionCanvas : Control {
    readonly Image image;
    Point begin,end;
    bool drawing;
    public SelectionCanvas(Image source){image=source;Dock=DockStyle.Fill;DoubleBuffered=true;Cursor=Cursors.Cross;BackColor=Color.FromArgb(30,25,38);}
    Rectangle ImageBounds {get{float ratio=Math.Min((float)Width/image.Width,(float)Height/image.Height);int w=(int)(image.Width*ratio),h=(int)(image.Height*ratio);return new Rectangle((Width-w)/2,(Height-h)/2,w,h);}}
    Point Map(Point point){var r=ImageBounds;if(r.Width==0||r.Height==0)return Point.Empty;return new Point(Math.Max(0,Math.Min(image.Width,(point.X-r.X)*image.Width/r.Width)),Math.Max(0,Math.Min(image.Height,(point.Y-r.Y)*image.Height/r.Height)));}
    public Rectangle ImageSelection {get{return Rectangle.FromLTRB(Math.Min(begin.X,end.X),Math.Min(begin.Y,end.Y),Math.Max(begin.X,end.X),Math.Max(begin.Y,end.Y));}}
    protected override void OnMouseDown(MouseEventArgs e){if(e.Button!=MouseButtons.Left||!ImageBounds.Contains(e.Location))return;drawing=true;Capture=true;begin=end=Map(e.Location);Invalidate();}
    protected override void OnMouseMove(MouseEventArgs e){if(!drawing)return;end=Map(e.Location);Invalidate();}
    protected override void OnMouseUp(MouseEventArgs e){drawing=false;Capture=false;Invalidate();}
    protected override void OnPaint(PaintEventArgs e){base.OnPaint(e);var r=ImageBounds;e.Graphics.DrawImage(image,r);var selected=ImageSelection;var rectangle=new Rectangle(r.X+selected.X*r.Width/image.Width,r.Y+selected.Y*r.Height/image.Height,selected.Width*r.Width/image.Width,selected.Height*r.Height/image.Height);using(var fill=new SolidBrush(Color.FromArgb(90,255,70,100)))e.Graphics.FillRectangle(fill,rectangle);using(var border=new Pen(Color.FromArgb(255,110,140),2))e.Graphics.DrawRectangle(border,rectangle);}
}

sealed class TransparencyPreview : PictureBox {
    protected override void OnPaint(PaintEventArgs e){if(Image!=null){float scale=Math.Min((float)ClientSize.Width/Image.Width,(float)ClientSize.Height/Image.Height);int w=(int)(Image.Width*scale),h=(int)(Image.Height*scale);var area=new Rectangle((Width-w)/2,(Height-h)/2,w,h);{var saved=e.Graphics.Save();e.Graphics.SetClip(area);for(int y=area.Top;y<area.Bottom;y+=12)for(int x=area.Left;x<area.Right;x+=12)e.Graphics.FillRectangle(((x-area.Left)/12+(y-area.Top)/12)%2==0?Brushes.WhiteSmoke:Brushes.LightGray,x,y,12,12);e.Graphics.Restore(saved);}}base.OnPaint(e);}
}
